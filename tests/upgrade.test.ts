import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
let db: PGlite;
const A = "a0000000-0000-4000-8000-000000000001";
const B = "a0000000-0000-4000-8000-000000000002";
let schedule: string, seat: string, pickup: string, dropoff: string, upgrade: string;
const read = (name: string) => readFile(new URL(`../supabase/${name}`, import.meta.url), "utf8");
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated;
    create publication supabase_realtime;`);
  await db.exec(await read("migrations/202610200001_initial.sql"));
  await db.exec(await read("seed.sql"));
  for (const [id, nim] of [[A, "09011282628001"], [B, "09011282628002"]]) {
    await db.query("insert into auth.users values($1,$2,$3,null)", [id, `${nim}@example.com`, JSON.stringify({ full_name: "Test Student", nim })]);
  }
  const s = (await db.query<{ id: string; route_id: string }>("select id,route_id from public.schedules order by departure_at limit 1")).rows[0];
  schedule = s.id;
  seat = (await db.query<{ id: string }>("select id from public.schedule_seats where schedule_id=$1 order by row_no,col_no limit 1", [schedule])).rows[0].id;
  [pickup, dropoff] = (await db.query<{ stop_id: string }>("select stop_id from public.route_stops where route_id=$1 order by stop_order", [s.route_id])).rows.map((r) => r.stop_id);
  // Reproduce the confirmed live schema: booking owner -> auth user, physical
  // seats via bus_seat_id, and academic/fare/label columns absent.
  await db.exec(`
    alter table public.bookings rename column student_id to user_id;
    alter table public.bookings rename column seat_id to schedule_seat_id;
    alter table public.bookings add column price integer not null;
    alter table public.notifications rename column recipient_id to user_id;
    alter table public.bus_seats add column seat_number integer;
    update public.bus_seats set seat_number=(row_no-1)*4+col_no;
    alter table public.bus_seats alter column seat_number set not null;
    alter table public.schedule_seats add column bus_seat_id uuid references public.bus_seats(id);
    update public.schedule_seats ss set bus_seat_id=b.id from public.bus_seats b,public.schedules s
      where s.id=ss.schedule_id and b.bus_id=s.bus_id and b.seat_label=ss.seat_label;
    alter table public.schedule_seats alter column bus_seat_id set not null;
    alter table public.bus_seats drop column seat_label,drop column row_no,drop column col_no;
    alter table public.schedule_seats drop column seat_label,drop column row_no,drop column col_no;
    alter table public.profiles drop column faculty,drop column program,drop column email;
    alter table public.buses drop column code;
    alter table public.schedules drop column fare_idr;
    alter table public.routes drop column origin,drop column destination;
    alter table public.route_stops drop column pickup_allowed,drop column dropoff_allowed;
    alter table public.stops drop column description;
  `);
  upgrade = await read("UPDATE_UNSRI_BUS.sql");
  await db.exec(upgrade);
}, 60000);
afterAll(async () => { await db?.close(); });

describe("one-file upgrade against the legacy schema", () => {
  it("can be run twice and stores the authoritative catalogue without duplicating records", async () => {
    await db.exec(upgrade);
    expect((await db.query<{ count: number }>("select count(*)::int as count from public.academic_faculties")).rows[0].count).toBe(11);
    expect((await db.query<{ count: number }>("select count(*)::int as count from public.academic_programs")).rows[0].count).toBe(122);
    expect((await db.query<{ count: number }>("select count(*)::int as count from public.schedules")).rows[0].count).toBe(28);
  });
  it("allows anonymous catalogue reads but denies catalogue writes and personal data reads", async () => {
    await db.exec("set role anon");
    expect((await db.query("select * from public.academic_programs where faculty_id='ft'")).rows).toHaveLength(13);
    await expect(db.exec("delete from public.academic_faculties")).rejects.toMatchObject({ code: "42501" });
    await expect(db.exec("select * from public.profiles")).rejects.toMatchObject({ code: "42501" });
    await db.exec("reset role");
  });
  it("preserves physical seat numbers and books without a separate email activation gate", async () => {
    await db.exec("reset role");
    await db.query("update public.schedules set fare_idr=5000 where id=$1", [schedule]);
    await asUser(A);
    const seats = (await db.query<{ id: string; seat_label: string; occupied: boolean }>("select * from public.unsri_v2_seat_availability($1)", [schedule])).rows;
    expect(seats.find((s) => s.id === seat)).toMatchObject({ seat_label: "1", occupied: false });
    await db.query("select public.unsri_v2_reserve_seat($1,$2,$3,$4)", [schedule, seat, pickup, dropoff]);
    const booking = (await db.query<{ student_id: string; user_id: string; seat_id: string; schedule_seat_id: string; price: number }>("select * from public.bookings")).rows[0];
    expect(booking.student_id).toBe(A);
    expect(booking.user_id).toBe(A);
    expect(booking.seat_id).toBe(booking.schedule_seat_id);
    expect(Number(booking.price)).toBe(5000);
    await asUser(B);
    expect((await db.query("select * from public.bookings")).rows).toHaveLength(0);
    expect((await db.query<{ occupied: boolean }>("select occupied from public.unsri_v2_seat_availability($1) where id=$2", [schedule, seat])).rows[0].occupied).toBe(true);
    await expect(db.query("select public.unsri_v2_reserve_seat($1,$2,$3,$4)", [schedule, seat, pickup, dropoff])).rejects.toMatchObject({ code: "23505" });
    await db.exec("reset role");
  });
  it("validates faculty/program pairs and saves them on the authenticated profile", async () => {
    await asUser(A);
    await db.query("update public.profiles set faculty=$1,program=$2 where id=$3", ["Fakultas Teknik", "S1 - Teknik Sipil", A]);
    expect((await db.query<{ program: string }>("select program from public.profiles")).rows[0].program).toBe("S1 - Teknik Sipil");
    await expect(db.query("update public.profiles set program=$1 where id=$2", ["S1 - Ilmu Hukum", A])).rejects.toMatchObject({ code: "23514" });
    await expect(db.query("update public.profiles set role='admin' where id=$1", [A])).rejects.toMatchObject({ code: "42501" });
    await db.exec("reset role");
  });
  it("allows admins to create new physical seats and a schedule through the upgraded RPC", async () => {
    await db.exec("reset role");
    await db.query("update public.profiles set role='admin' where id=$1", [B]);
    await asUser(B);
    const bus = (await db.query<{ id: string }>("select public.unsri_v2_manage_entity('bus',null,$1) id", [JSON.stringify({
      code: "TEST-NEW", name: "Bus Pengujian", plate_number: "BG TEST", capacity: 8, status: "operating",
    })])).rows[0].id;
    const route = (await db.query<{ route_id: string }>("select route_id from public.schedules where id=$1", [schedule])).rows[0].route_id;
    const created = (await db.query<{ id: string }>("select public.unsri_v2_manage_entity('schedule',null,$1) id", [JSON.stringify({
      bus_id: bus, route_id: route, departure_at: new Date(Date.now()+86400000*40).toISOString(),
      arrival_at: new Date(Date.now()+86400000*40+3600000).toISOString(), fare_idr: 5000,
    })])).rows[0].id;
    expect((await db.query("select * from public.unsri_v2_seat_availability($1)", [created])).rows).toHaveLength(8);
    await db.exec("reset role");
  });
});
