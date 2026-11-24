import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migrationPath = resolve(root, "supabase/migrations/202610200002_compatibility_academics.sql");
const outputPath = resolve(root, "supabase/RESET_DATABASE.sql");
let schema = readFileSync(migrationPath, "utf8");

schema = schema
  .replace(/^-- UNSRI Bus upgrade:[\s\S]*?begin;/, "")
  .replace(/notify pgrst, 'reload schema';\s*commit;[\s\S]*$/m, "");

const prelude = `-- UNSRI Bus - FULL DATABASE RESET + SEED
-- WARNING: this deletes every UNSRI Bus record in public.* listed below.
-- Supabase Auth users are also deleted so registration starts completely clean.
-- Run this entire file once in Supabase SQL Editor.

begin;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists zzz_unsri_v2_auth_profile on auth.users;
drop trigger if exists unsri_auth_profile_created on auth.users;

-- Full reset requested: remove existing login accounts and their Auth identities.
delete from auth.users;

drop table if exists public.rate_limits cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.notifications cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.bookings cascade;
drop table if exists public.schedule_seats cascade;
drop table if exists public.schedules cascade;
drop table if exists public.route_stops cascade;
drop table if exists public.stops cascade;
drop table if exists public.routes cascade;
drop table if exists public.bus_seats cascade;
drop table if exists public.buses cascade;
drop table if exists public.academic_programs cascade;
drop table if exists public.academic_faculties cascade;
drop table if exists public.profiles cascade;

drop function if exists public.is_admin() cascade;
drop function if exists public.is_active_user() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.consume_rate(text,integer) cascade;
drop function if exists public.seat_availability(uuid) cascade;
drop function if exists public.schedule_capacity() cascade;
drop function if exists public.reserve_seat(uuid,uuid,uuid,uuid) cascade;
drop function if exists public.cancel_booking(uuid) cascade;
drop function if exists public.open_conversation() cascade;
drop function if exists public.send_message(uuid,text) cascade;
drop function if exists public.manage_entity(text,uuid,jsonb) cascade;
drop function if exists public.unsri_v2_legacy_columns() cascade;
drop function if exists public.unsri_v2_is_admin() cascade;
drop function if exists public.unsri_v2_is_active_user() cascade;
drop function if exists public.unsri_v2_handle_new_user() cascade;
drop function if exists public.unsri_v2_consume_rate(text,integer) cascade;
drop function if exists public.unsri_v2_seat_availability(uuid) cascade;
drop function if exists public.unsri_v2_schedule_capacity() cascade;
drop function if exists public.unsri_v2_reserve_seat(uuid,uuid,uuid,uuid) cascade;
drop function if exists public.unsri_v2_cancel_booking(uuid) cascade;
drop function if exists public.unsri_v2_open_conversation() cascade;
drop function if exists public.unsri_v2_send_message(uuid,text) cascade;
drop function if exists public.unsri_v2_manage_entity(text,uuid,jsonb) cascade;
drop function if exists public.unsri_validate_academics() cascade;
drop function if exists public.unsri_validate_profile_academics() cascade;
drop function if exists public.unsri_notify_conversation_closed() cascade;
drop function if exists public.unsri_v2_mark_messages_read(uuid) cascade;
drop sequence if exists public.unsri_placeholder_nim_seq cascade;

`;

const seed = `
-- Install the final signup trigger. New accounts are active immediately.
drop trigger if exists unsri_validate_academics on public.profiles;
create sequence if not exists public.unsri_placeholder_nim_seq
  as bigint start with 1 increment by 1;
create or replace function public.unsri_v2_handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  student_name text := trim(coalesce(new.raw_user_meta_data->>'full_name',''));
  student_nim text := trim(coalesce(new.raw_user_meta_data->>'nim',''));
  requested_faculty text := trim(coalesce(new.raw_user_meta_data->>'faculty',''));
  requested_program text := trim(coalesce(new.raw_user_meta_data->>'program',''));
  student_faculty text := '';
  student_program text := '';
begin
  if length(student_name) not between 3 and 80 then
    student_name:=left(coalesce(nullif(split_part(coalesce(new.email,''),'@',1),''),'Pengguna UNSRI'),80);
    if length(student_name)<3 then student_name:='Pengguna UNSRI'; end if;
  end if;
  if student_nim !~ '^[0-9]{7,20}$' then
    student_nim:='8'||lpad(nextval('public.unsri_placeholder_nim_seq')::text,19,'0');
  end if;
  if requested_faculty<>'' and requested_program<>'' and exists (
    select 1 from public.academic_programs ap
    join public.academic_faculties af on af.id=ap.faculty_id
    where af.name=requested_faculty and ap.label=requested_program
  ) then
    student_faculty:=requested_faculty;
    student_program:=requested_program;
  end if;
  insert into public.profiles(id,full_name,nim,email,phone,faculty,program,role,status)
  values(new.id,student_name,student_nim,coalesce(new.email,''),'',student_faculty,student_program,'student','active');
  return new;
end $$;
alter function public.unsri_v2_handle_new_user() owner to postgres;
revoke all on function public.unsri_v2_handle_new_user() from public,anon,authenticated;
drop trigger if exists zzz_unsri_v2_auth_profile on auth.users;
drop trigger if exists unsri_auth_profile_created on auth.users;
create trigger unsri_auth_profile_created after insert on auth.users
for each row execute function public.unsri_v2_handle_new_user();

-- Notify the student when an admin closes a support conversation.
create or replace function public.unsri_notify_conversation_closed()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.status is distinct from 'closed' and new.status='closed' then
    insert into public.notifications(recipient_id,type,title,body)
    values(new.student_id,'chat_closed','Percakapan bantuan selesai',
      'Admin telah menutup percakapan bantuan Anda. Anda dapat memulai kembali chat jika masih memerlukan bantuan.');
  end if;
  return new;
end $$;
alter function public.unsri_notify_conversation_closed() owner to postgres;
revoke all on function public.unsri_notify_conversation_closed() from public,anon,authenticated;
drop trigger if exists unsri_conversation_closed_notification on public.conversations;
create trigger unsri_conversation_closed_notification
after update of status on public.conversations
for each row execute function public.unsri_notify_conversation_closed();

create or replace function public.unsri_v2_mark_messages_read(p_conversation uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
  if not exists (
    select 1 from public.conversations c
    where c.id=p_conversation
      and (c.student_id=auth.uid() or public.unsri_v2_is_admin())
  ) then raise exception 'Akses percakapan ditolak.' using errcode='42501'; end if;
  update public.messages set read_at=now()
  where conversation_id=p_conversation and sender_id<>auth.uid() and read_at is null;
  get diagnostics changed=row_count;
  return changed;
end $$;
alter function public.unsri_v2_mark_messages_read(uuid) owner to postgres;
revoke all on function public.unsri_v2_mark_messages_read(uuid) from public,anon,authenticated;
grant execute on function public.unsri_v2_mark_messages_read(uuid) to authenticated;

insert into public.stops(id,name,description,is_active) values
 ('10000000-0000-4000-8000-000000000001','Terminal UNSRI Indralaya','Terminal utama dalam Kampus UNSRI Indralaya',true),
 ('10000000-0000-4000-8000-000000000002','Halte FISIP','Area Fakultas Ilmu Sosial dan Ilmu Politik, Kampus Indralaya',true),
 ('10000000-0000-4000-8000-000000000003','Halte FKIP','Area Fakultas Keguruan dan Ilmu Pendidikan, Kampus Indralaya',true),
 ('10000000-0000-4000-8000-000000000004','Halte Fasilkom','Area Fakultas Ilmu Komputer, Kampus Indralaya',true),
 ('10000000-0000-4000-8000-000000000005','Kampus Bukit Besar','Kampus UNSRI Bukit Besar, Palembang',true),
 ('10000000-0000-4000-8000-000000000006','Terminal Kertapati','Titik transit Kertapati, Palembang',true);

insert into public.routes(id,name,origin,destination,is_active) values
 ('20000000-0000-4000-8000-000000000001','Indralaya → Bukit Besar','Kampus Indralaya','Bukit Besar',true),
 ('20000000-0000-4000-8000-000000000002','Bukit Besar → Indralaya','Bukit Besar','Kampus Indralaya',true),
 ('20000000-0000-4000-8000-000000000003','Indralaya → Kertapati','Kampus Indralaya','Kertapati',true),
 ('20000000-0000-4000-8000-000000000004','Kertapati → Indralaya','Kertapati','Kampus Indralaya',true);

insert into public.route_stops(route_id,stop_id,stop_order,pickup_allowed,dropoff_allowed) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,true,false),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',2,true,true),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003',3,true,true),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000005',4,false,true),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000005',1,true,false),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003',2,true,true),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',3,true,true),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',4,false,true),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001',1,true,false),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004',2,true,true),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000006',3,false,true),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000006',1,true,false),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004',2,true,true),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001',3,false,true);

insert into public.buses(id,code,name,plate_number,capacity,status) values
 ('30000000-0000-4000-8000-000000000001','UNSRI-01','UNSRI Bus 01','BG 7001 UA',40,'operating'),
 ('30000000-0000-4000-8000-000000000002','UNSRI-02','UNSRI Bus 02','BG 7002 UA',40,'operating'),
 ('30000000-0000-4000-8000-000000000003','UNSRI-03','UNSRI Bus 03','BG 7003 UA',32,'operating'),
 ('30000000-0000-4000-8000-000000000004','UNSRI-04','UNSRI Bus 04','BG 7004 UA',32,'operating'),
 ('30000000-0000-4000-8000-000000000005','UNSRI-05','UNSRI Bus 05','BG 7005 UA',40,'maintenance');

insert into public.bus_seats(bus_id,seat_label,row_no,col_no)
select b.id,chr(65+(n-1)%4)||((n-1)/4+1)::text,(n-1)/4+1,(n-1)%4+1
from public.buses b cross join lateral generate_series(1,b.capacity) n;

do $$
declare d integer; item record; schedule_id uuid; departure timestamptz;
begin
  for d in 0..13 loop
    for item in select * from (values
      ('20000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,6,30,75,5000),
      ('20000000-0000-4000-8000-000000000002'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,9,0,75,5000),
      ('20000000-0000-4000-8000-000000000003'::uuid,'30000000-0000-4000-8000-000000000002'::uuid,7,0,60,5000),
      ('20000000-0000-4000-8000-000000000004'::uuid,'30000000-0000-4000-8000-000000000002'::uuid,10,0,60,5000),
      ('20000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000003'::uuid,13,0,75,5000),
      ('20000000-0000-4000-8000-000000000002'::uuid,'30000000-0000-4000-8000-000000000003'::uuid,16,0,75,5000),
      ('20000000-0000-4000-8000-000000000003'::uuid,'30000000-0000-4000-8000-000000000004'::uuid,14,0,60,5000),
      ('20000000-0000-4000-8000-000000000004'::uuid,'30000000-0000-4000-8000-000000000004'::uuid,18,0,60,5000)
    ) as v(route_id,bus_id,hour_no,minute_no,duration_minutes,fare) loop
      departure:=(((now() at time zone 'Asia/Jakarta')::date+d)+make_time(item.hour_no,item.minute_no,0)) at time zone 'Asia/Jakarta';
      insert into public.schedules(route_id,bus_id,departure_at,arrival_at,fare_idr,status)
      values(item.route_id,item.bus_id,departure,departure+make_interval(mins=>item.duration_minutes),item.fare,'scheduled')
      returning id into schedule_id;
      insert into public.schedule_seats(schedule_id,seat_label,row_no,col_no)
      select schedule_id,seat_label,row_no,col_no from public.bus_seats where bus_id=item.bus_id;
    end loop;
  end loop;
end $$;

do $$ declare table_name text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach table_name in array array['messages','notifications'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
        execute format('alter publication supabase_realtime add table public.%I',table_name);
      end if;
    end loop;
  end if;
end $$;

notify pgrst, 'reload schema';
commit;

select 'RESET SELESAI' as status,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.academic_faculties) as faculties,
  (select count(*) from public.academic_programs) as programs,
  (select count(*) from public.stops) as stops,
  (select count(*) from public.routes) as routes,
  (select count(*) from public.buses) as buses,
  (select count(*) from public.schedules) as schedules,
  (select count(*) from public.schedule_seats) as schedule_seats;
`;

writeFileSync(outputPath, prelude + schema + seed, "utf8");
console.log(`Generated ${outputPath}`);
