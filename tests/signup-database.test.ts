import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

let db: PGlite;
const read = (name: string) => readFile(new URL(`../supabase/${name}`, import.meta.url), "utf8");
async function insertUser(suffix: number, metadata: Record<string, unknown> = {}) {
  const id = `b0000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
  await db.exec("set role supabase_auth_admin");
  try {
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)", [
      id, `signup-${suffix}@example.com`,
      JSON.stringify({ full_name: "Mahasiswa Baru", nim: `0901128262${String(suffix).padStart(4, "0")}`, ...metadata }),
    ]);
  } finally { await db.exec("reset role"); }
  return id;
}
beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create role anon; create role authenticated; create role supabase_auth_admin;
    create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,supabase_auth_admin;
    grant insert on auth.users to supabase_auth_admin;
    create publication supabase_realtime;
  `);
  await db.exec(await read("migrations/202610200001_initial.sql"));
  // Use the immutable previous migration to reproduce the deployed issue.
  await db.exec(await read("migrations/202610200002_compatibility_academics.sql"));
  // A legacy Auth trigger remains installed, but runs as the Auth service role.
  await db.exec("alter function public.handle_new_user() security invoker");
}, 60000);
afterAll(async () => { await db?.close(); });

describe("signup using Supabase Auth database privileges", () => {
  it("reproduces a legacy trigger preventing registration before the newer trigger runs", async () => {
    await expect(insertUser(1)).rejects.toMatchObject({ code: "42501" });
    expect((await db.query("select * from auth.users")).rows).toHaveLength(0);
  });
  it("repairs signup and can be applied again without duplicating the profile", async () => {
    const repair = await read("FIX_SIGNUP.sql");
    await db.exec(repair);
    await db.exec(repair);
    const id = await insertUser(2, { faculty: "Fakultas Teknik", program: "S1 - Teknik Sipil", role: "admin", status: "suspended" });
    const rows = (await db.query("select * from public.profiles where id=$1", [id])).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      full_name: "Mahasiswa Baru", faculty: "Fakultas Teknik", program: "S1 - Teknik Sipil",
      email: "signup-2@example.com", role: "student", status: "active",
    });
  });
  it("accepts optional blank academics and preserves other Auth hooks", async () => {
    await db.exec(`create table public.signup_audit(user_id uuid);
      create function public.test_auth_audit() returns trigger language plpgsql security definer set search_path='' as
        $$ begin insert into public.signup_audit values(new.id); return new; end $$;
      create trigger test_auth_audit after insert on auth.users for each row execute function public.test_auth_audit();`);
    await db.exec(await read("FIX_SIGNUP.sql"));
    const id = await insertUser(3);
    expect((await db.query("select * from public.signup_audit where user_id=$1", [id])).rows).toHaveLength(1);
    expect((await db.query("select faculty,program from public.profiles where id=$1", [id])).rows).toEqual([{ faculty: "", program: "" }]);
  });
  it("rejects invalid academics and duplicate NIM atomically without leaving an Auth-only account", async () => {
    await expect(insertUser(4, { faculty: "Fakultas Teknik", program: "S1 - Ilmu Hukum" })).rejects.toMatchObject({ code: "23514" });
    await expect(insertUser(5, { nim: "09011282620002" })).rejects.toMatchObject({ code: "23505" });
    expect((await db.query("select id from auth.users where email in ('signup-4@example.com','signup-5@example.com')")).rows).toHaveLength(0);
  });
});
