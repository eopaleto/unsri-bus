import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

// Execute the actual migration in PostgreSQL WASM. Only Supabase's auth schema
// and JWT identity helper are supplied by the harness; policies/RPCs are unmodified.
let db: PGlite;
const A="a0000000-0000-4000-8000-000000000001";
const B="a0000000-0000-4000-8000-000000000002";
const ADMIN="a0000000-0000-4000-8000-000000000003";
let schedule:string, seat1:string, seat2:string, pickup:string, dropoff:string;
async function user(id:string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);
  await db.exec("set local role authenticated");
}
async function reserve(seat=seat1) {
  const result=await db.query<{id:string}>("select public.reserve_seat($1,$2,$3,$4) id",[schedule,seat,pickup,dropoff]);
  return result.rows[0].id;
}
async function rejected(sql:string,values:unknown[],code:string) {
  await db.exec("savepoint expected_failure");
  let caught:unknown;
  try { await db.query(sql,values); } catch(e) { caught=e; }
  await db.exec("rollback to savepoint expected_failure; release savepoint expected_failure");
  expect((caught as {code:string}|undefined)?.code).toBe(code);
}
beforeAll(async()=>{
  db=new PGlite({extensions:{pgcrypto}});
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    create publication supabase_realtime;
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/202610200001_initial.sql",import.meta.url),"utf8"));
  await db.exec(await readFile(new URL("../supabase/seed.sql",import.meta.url),"utf8"));
  for(const [id,nim,name] of [[A,"09011282628001","Student Alpha"],[B,"09011282628002","Student Beta"],[ADMIN,"09011282628003","Admin Test"]]){
    await db.query("insert into auth.users values($1,$2,$3,now())",[id,`${nim}@example.com`,JSON.stringify({full_name:name,nim,role:"admin"})]);
  }
  await db.query("update public.profiles set role='admin' where id=$1",[ADMIN]);
  const s=await db.query<{id:string,route_id:string}>("select id,route_id from public.schedules order by departure_at limit 1");
  schedule=s.rows[0].id;
  const seats=await db.query<{id:string}>("select id from public.schedule_seats where schedule_id=$1 order by row_no,col_no limit 2",[schedule]);
  [seat1,seat2]=seats.rows.map(r=>r.id);
  const stops=await db.query<{stop_id:string}>("select stop_id from public.route_stops where route_id=$1 order by stop_order",[s.rows[0].route_id]);
  [pickup,dropoff]=stops.rows.map(r=>r.stop_id);
},60000);
beforeEach(async()=>{await db.exec("begin");});
afterEach(async()=>{await db.exec("rollback");});
afterAll(async()=>{await db.close();});

describe("PostgreSQL migration and RLS",()=>{
  it("aggregates capacity without truncating more than 1,000 individual seats",async()=>{
    await user(A);
    const rows=(await db.query<{capacity:number;available:number}>("select * from public.schedule_capacity()")).rows;
    expect(rows).toHaveLength(28);
    expect(rows.every(r=>Number(r.capacity)===40&&Number(r.available)===40)).toBe(true);
  });
  it("forces student role even when Auth metadata requests admin",async()=>{
    await user(A);
    const result=await db.query<{role:string}>("select role from public.profiles");
    expect(result.rows).toEqual([{role:"student"}]);
    await rejected("update public.profiles set role='admin' where id=$1",[A],"42501");
    await rejected("update public.profiles set nim='9999999' where id=$1",[A],"42501");
  });
  it("denies anonymous reads and direct booking writes",async()=>{
    await db.exec("set local role anon");
    await rejected("select * from public.bookings",[],"42501");
    await user(A);
    await rejected("insert into public.bookings(student_id,schedule_id,seat_id,pickup_stop_id,dropoff_stop_id) values($1,$2,$3,$4,$5)",[A,schedule,seat1,pickup,dropoff],"42501");
    await rejected("select public.consume_rate('bypass',1000)",[],"42501");
  });
  it("isolates bookings while revealing only seat availability to peers",async()=>{
    await user(A);const booking=await reserve();
    await user(B);
    expect((await db.query("select * from public.bookings where id=$1",[booking])).rows).toHaveLength(0);
    const seats=await db.query<{occupied:boolean}>("select occupied from public.seat_availability($1) where id=$2",[schedule,seat1]);
    expect(seats.rows[0].occupied).toBe(true);
    await rejected("select public.cancel_booking($1)",[booking],"42501");
  });
  it("prevents both duplicate seats and multiple active reservations by one student",async()=>{
    await user(A);await reserve();
    await rejected("select public.reserve_seat($1,$2,$3,$4)",[schedule,seat2,pickup,dropoff],"23505");
    await user(B);
    await rejected("select public.reserve_seat($1,$2,$3,$4)",[schedule,seat1,pickup,dropoff],"23505");
  });
  it("releases cancelled seats and preserves the old booking record",async()=>{
    await user(A);const booking=await reserve();
    await db.query("select public.cancel_booking($1)",[booking]);
    expect((await db.query<{status:string}>("select status from public.bookings where id=$1",[booking])).rows[0].status).toBe("cancelled");
    await user(B);expect(await reserve()).toBeTruthy();
  });
  it("rejects reversed stops, foreign schedule seats and cut-off bookings",async()=>{
    await user(A);
    await rejected("select public.reserve_seat($1,$2,$3,$4)",[schedule,seat1,dropoff,pickup],"P0001");
    await db.exec("reset role");
    const foreign=(await db.query<{id:string}>("select id from public.schedule_seats where schedule_id<>$1 limit 1",[schedule])).rows[0].id;
    await user(A);
    await rejected("select public.reserve_seat($1,$2,$3,$4)",[schedule,foreign,pickup,dropoff],"P0001");
    await db.exec("reset role");
    await db.query("update public.schedules set departure_at=now()+interval '30 minutes' where id=$1",[schedule]);
    await user(A);
    await rejected("select public.reserve_seat($1,$2,$3,$4)",[schedule,seat1,pickup,dropoff],"P0001");
  });
  it("requires a verified email and prevents admin/student role misuse",async()=>{
    await db.query("update auth.users set email_confirmed_at=null where id=$1",[A]);
    await user(A);
    await rejected("select public.reserve_seat($1,$2,$3,$4)",[schedule,seat1,pickup,dropoff],"42501");
    await rejected("select public.manage_entity('stop',null,'{\"name\":\"Unauthorized\"}')",[],"42501");
    await user(ADMIN);
    await rejected("select public.reserve_seat($1,$2,$3,$4)",[schedule,seat1,pickup,dropoff],"42501");
  });
  it("isolates messages and validates thread membership",async()=>{
    await user(A);
    const c=(await db.query<{id:string}>("select public.open_conversation() id")).rows[0].id;
    await db.query("select public.send_message($1,'Private message')",[c]);
    await user(B);
    expect((await db.query("select * from public.messages")).rows).toHaveLength(0);
    await rejected("select public.send_message($1,'Injected message')",[c],"42501");
    await user(ADMIN);
    expect((await db.query("select * from public.messages")).rows).toHaveLength(1);
    await db.query("select public.send_message($1,'Admin reply')",[c]);
    await user(A);
    expect((await db.query("select * from public.messages")).rows).toHaveLength(2);
    expect((await db.query("select * from public.notifications where type='chat'")).rows).toHaveLength(1);
  });
  it("locks booked schedule edits and cancels passengers atomically with notifications",async()=>{
    await user(A);await reserve();
    await user(ADMIN);
    await rejected("select public.manage_entity('schedule',$1,'{}')",[schedule],"P0001");
    await db.query("select public.manage_entity('cancel_schedule',$1,'{\"reason\":\"Armada mengalami kerusakan\"}')",[schedule]);
    expect((await db.query<{status:string}>("select status from public.bookings where schedule_id=$1",[schedule])).rows[0].status).toBe("cancelled");
    expect((await db.query("select * from public.audit_logs where entity_id=$1",[schedule])).rows).toHaveLength(1);
    await user(A);
    expect((await db.query("select * from public.notifications where type='cancellation'")).rows).toHaveLength(1);
    await rejected("select public.reserve_seat($1,$2,$3,$4)",[schedule,seat2,pickup,dropoff],"P0001");
  });
  it("creates audited bus templates and schedule snapshots using admin RPC",async()=>{
    await user(ADMIN);
    const bus=(await db.query<{id:string}>("select public.manage_entity('bus',null,$1::jsonb) id",[JSON.stringify({code:"TEST-01",name:"Test Bus",plate_number:"TEST PLATE",capacity:12,status:"operating"})])).rows[0].id;
    const route=(await db.query<{id:string}>("select id from public.routes limit 1")).rows[0].id;
    const departure=new Date(Date.now()+86400000).toISOString(),arrival=new Date(Date.now()+90000000).toISOString();
    const scheduleId=(await db.query<{id:string}>("select public.manage_entity('schedule',null,$1::jsonb) id",[JSON.stringify({route_id:route,bus_id:bus,departure_at:departure,arrival_at:arrival,fare_idr:5000})])).rows[0].id;
    expect((await db.query("select * from public.bus_seats where bus_id=$1",[bus])).rows).toHaveLength(12);
    expect((await db.query("select * from public.schedule_seats where schedule_id=$1",[scheduleId])).rows).toHaveLength(12);
    await rejected("select public.manage_entity('bus',$1,$2::jsonb)",[bus,JSON.stringify({code:"TEST-01",name:"Test Bus",plate_number:"TEST PLATE",capacity:8,status:"operating"})],"P0001");
  });
});
