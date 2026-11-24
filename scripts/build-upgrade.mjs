// Produce the single SQL Editor file and versioned migration from reviewed sources.
import { readFile, writeFile } from "node:fs/promises";
const read = async (path) => (await readFile(new URL(`../${path}`, import.meta.url), "utf8")).replaceAll("\r\n", "\n");
const initial = await read("supabase/migrations/202610200001_initial.sql");
const columns = await read("supabase/upgrade-columns.sql");
const academics = await read("supabase/academic-schema.sql");
const signupFix = await read("supabase/FIX_SIGNUP.sql");
const signupLogic = signupFix.slice(signupFix.indexOf("\nbegin;") + 7, signupFix.lastIndexOf("\nnotify pgrst"));
const bookingFix = await read("supabase/FIX_BOOKING.sql");
const bookingLogic = bookingFix.slice(bookingFix.indexOf("\nbegin;") + 7, bookingFix.lastIndexOf("\nnotify pgrst"));
const catalog = JSON.parse(await read("data/unsri-academics.json"));
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const functions = ["is_admin", "is_active_user", "handle_new_user", "consume_rate", "seat_availability", "schedule_capacity", "reserve_seat", "cancel_booking", "open_conversation", "send_message", "manage_entity"];
let tables = initial.slice(initial.indexOf("create table"), initial.indexOf("create function"))
  .replaceAll("create table public.", "create table if not exists public.")
  .replace(/^create (?:unique )?index .*;\r?$/gm, "");
let logic = initial.slice(initial.indexOf("create function"), initial.indexOf("-- Explicit function allowlist"));
for (const name of functions) logic = logic.replaceAll(`public.${name}(`, `public.unsri_v2_${name}(`);
logic = logic.replaceAll("create function public.", "create or replace function public.");
logic = logic.replace("grant update(full_name,phone,faculty,program)", "revoke update(id,role,status,nim,email),insert(id,role,status,nim,email) on public.profiles from anon,authenticated;\ngrant update(full_name,phone,faculty,program)");
logic = logic.replace("create trigger on_auth_user_created", "drop trigger if exists zzz_unsri_v2_auth_profile on auth.users;\ncreate trigger zzz_unsri_v2_auth_profile");
logic = logic.replace("coalesce(new.raw_user_meta_data->>'program',''));", "coalesce(new.raw_user_meta_data->>'program',''))\n  on conflict(id) do update set email=excluded.email,faculty=excluded.faculty,program=excluded.program,role='student',status='active';");
logic = logic.replace("select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=auth.uid() and p.role='student' and u.email_confirmed_at is not null", "select 1 from public.profiles p where p.id=auth.uid() and p.role='student'");
logic = logic.replace("Verifikasi email mahasiswa sebelum memesan.", "Hanya mahasiswa yang dapat memesan.");
// Historical schedule seats may reference physical bus seats. Rebuild layouts only
// when no schedule uses the bus; keep historical seats intact otherwise.
logic = logic.replace("delete from public.bus_seats where bus_id=result;\n    insert into public.bus_seats", "if not exists(select 1 from public.schedules where bus_id=result) then\n    delete from public.bus_seats where bus_id=result;\n    insert into public.bus_seats");
logic = logic.replace("from generate_series(1,cap) n;\n  elsif", "from generate_series(1,cap) n;\n    end if;\n  elsif");
// Do not permit a capacity change that would invalidate historical physical seats.
logic = logic.replace("cap:=(p_data->>'capacity')::integer;", `cap:=(p_data->>'capacity')::integer;
    if p_id is not null and exists(select 1 from public.schedules where bus_id=p_id)
      and exists(select 1 from public.buses where id=p_id and capacity<>cap)
      then raise exception 'Bus memiliki riwayat jadwal. Buat armada baru untuk kapasitas berbeda.'; end if;`);
const signatures = [
  "is_admin()", "is_active_user()", "handle_new_user()", "consume_rate(text,integer)",
  "seat_availability(uuid)", "schedule_capacity()", "reserve_seat(uuid,uuid,uuid,uuid)",
  "cancel_booking(uuid)", "open_conversation()", "send_message(uuid,text)", "manage_entity(text,uuid,jsonb)",
];
const grants = signatures.map((signature) => {
  const name = `public.unsri_v2_${signature}`;
  return `revoke all on function ${name} from public,anon,authenticated;` +
    (signature.startsWith("handle_new") || signature.startsWith("consume_rate") ? "" : `\ngrant execute on function ${name} to authenticated;`);
}).join("\n");
const rows = catalog.map((f, index) => `(${[f.id, f.name, f.source_url].map(quote)},${index + 1},'2026-10-20')`);
const programs = catalog.flatMap((f) => f.programs.map((label) => {
  const [degree, ...parts] = label.split(" - ");
  const id = `${f.id}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`;
  return `(${[id, f.id, parts.join(" - "), degree, label, f.program_sources?.[label] || f.source_url].map(quote)},'2026-10-20')`;
}));
const seed = `insert into public.academic_faculties(id,name,source_url,sort_order,verified_on) values\n${rows.join(",\n")}
on conflict(id) do update set name=excluded.name,source_url=excluded.source_url,sort_order=excluded.sort_order,verified_on=excluded.verified_on;
insert into public.academic_programs(id,faculty_id,name,degree,label,source_url,verified_on) values\n${programs.join(",\n")}
on conflict(id) do update set name=excluded.name,degree=excluded.degree,label=excluded.label,source_url=excluded.source_url,verified_on=excluded.verified_on;\n`;
const sql = `-- UNSRI Bus upgrade: paste this entire file into Supabase SQL Editor and Run.
-- Generated by node scripts/build-upgrade.mjs. Safe to run again.
-- Preserves records, adds compatibility columns, installs v2 RPCs and app RLS,
-- and stores the verified UNSRI academic catalogue. No demo trips are inserted.
-- Existing fares without a fare column start at 0; set real fares in Kelola Jadwal.
begin;
create extension if not exists pgcrypto;
${tables}
${columns}
${logic}
${grants}
${academics}
${seed}
${signupLogic}
${bookingLogic}
do $$ declare t text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach t in array array['messages','notifications'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
        execute format('alter publication supabase_realtime add table public.%I',t);
      end if;
    end loop;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
select 'Pembaruan selesai' as status,
  (select count(*) from public.academic_faculties) as fakultas_dan_pascasarjana,
  (select count(*) from public.academic_programs) as program_studi;
`;
await writeFile(new URL("../supabase/UPDATE_UNSRI_BUS.sql", import.meta.url), sql);
// Do not rewrite a migration that may already have been deployed.
await writeFile(new URL("../supabase/migrations/202610200002_compatibility_academics.sql", import.meta.url), sql, { flag: "wx" })
  .catch((error) => { if (error.code !== "EEXIST") throw error; });
await writeFile(new URL("../supabase/migrations/202610210001_fix_signup.sql", import.meta.url), signupFix);
await writeFile(new URL("../supabase/migrations/202610210002_fix_booking_price.sql", import.meta.url), bookingFix);
console.log(`Generated upgrade with ${catalog.length} faculties/units and ${programs.length} programs.`);
