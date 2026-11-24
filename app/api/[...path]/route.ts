import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { configured, supabaseServer } from "@/lib/supabase/server";
import { bookingSchema, entitySchemas, profileSchema, registerSchema } from "@/lib/validation";
import { canAccessProfile, normalizeProfile } from "@/lib/auth-profile";
import { attachStudentProfiles } from "@/lib/profile-relations";
import { bookingSelect, scheduleSelect } from "@/lib/queries";
import { academicCatalog, validateAcademicSelection } from "@/lib/academic-server";
export const dynamic = "force-dynamic";
function fail(message: string, status = 400): never { throw Object.assign(new Error(message), { status }); }
function checked<T extends { data?: unknown; error: { message: string; code?: string } | null }>(result: T): NonNullable<T["data"]> {
  if (result.error) {
    const { code, message } = result.error;
    if (code === "PGRST202" || code === "PGRST200" || code === "42703") {
      fail("Database perlu diperbarui. Jalankan supabase/UPDATE_UNSRI_BUS.sql melalui SQL Editor, lalu muat ulang halaman.", 503);
    }
    fail(code === "23505" ? "Kursi sudah dipesan atau Anda sudah memiliki tiket pada jadwal ini." : message, code === "23505" ? 409 : code === "42501" ? 403 : 400);
  }
  return result.data as NonNullable<T["data"]>;
}
async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const path = (await context.params).path.join("/");
    const method = request.method;
    if (!configured()) return NextResponse.json({ error: "Supabase belum dikonfigurasi. Gunakan pratinjau demo atau ikuti panduan setup." }, { status: 503 });
    if (method !== "GET") {
      const origin = request.headers.get("origin");
      const allowed = new Set([request.nextUrl.origin]);
      if (process.env.NEXT_PUBLIC_SITE_URL) allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
      if (!origin || !allowed.has(origin)) fail("Asal permintaan tidak diizinkan.", 403);
    }
    const client = await supabaseServer();
    let body: Record<string, unknown> = {};
    if (method !== "GET") {
      const raw = await request.text();
      if (raw.length > 16000) fail("Permintaan terlalu besar.", 413);
      try { body = JSON.parse(raw || "{}"); } catch { fail("JSON tidak valid."); }
      if (!body || typeof body !== "object" || Array.isArray(body)) fail("Format permintaan tidak valid.");
    }
    const site = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const ok = (data: unknown, status = 200) => NextResponse.json({ data }, { status, headers: { "Cache-Control": "private, no-store" } });
    if (path === "academics" && method === "GET") return ok(await academicCatalog(client));
    if (path === "auth/register" && method === "POST") {
      const value = registerSchema.parse(body);
      await validateAcademicSelection(client, value.faculty, value.program);
      const signup = await client.auth.signUp({ email: value.email, password: value.password,
        options: { emailRedirectTo: `${site}/auth/callback`, data: { full_name: value.full_name, nim: value.nim, faculty: value.faculty, program: value.program } } });
      if (signup.error && (signup.error.message.includes("Database error saving new user") || signup.error.code === "unexpected_failure")) {
        fail(`Profil gagal disimpan oleh Supabase (${signup.error.code || "tanpa kode"}): ${signup.error.message}. Jalankan supabase/REPAIR_SIGNUP.sql, lalu coba lagi.`, 409);
      }
      const result = checked(signup);
      if (!result.session) {
        fail("Pendaftaran belum menghasilkan sesi. Pengelola perlu menonaktifkan Confirm email di pengaturan Supabase agar akun dapat langsung digunakan.", 409);
      }
      return ok({ message: "Pendaftaran berhasil. Akun dapat langsung digunakan." }, 201);
    }
    if (path === "auth/login" && method === "POST") {
      const value = z.object({ email: z.email(), password: z.string().min(1).max(128) }).parse(body);
      const result = await client.auth.signInWithPassword(value);
      if (result.error) {
        if (result.error.code === "email_not_confirmed") fail("Konfigurasi Supabase masih meminta konfirmasi email. Nonaktifkan Confirm email agar login tidak memerlukan aktivasi.", 403);
        fail("Email atau kata sandi tidak sesuai.", 401);
      }
      return ok({ message: "Berhasil masuk." });
    }
    if (path === "auth/recover" && method === "POST") {
      const { email } = z.object({ email: z.email() }).parse(body);
      checked(await client.auth.resetPasswordForEmail(email, { redirectTo: `${site}/auth/callback?next=/reset-password` }));
      return ok({ message: "Jika akun tersedia, tautan pemulihan telah dikirim." });
    }
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) fail("Silakan masuk untuk melanjutkan.", 401);
    if (path === "auth/logout" && method === "POST") { checked(await client.auth.signOut()); return ok(true); }
    const row = checked(await client.from("profiles").select("*").eq("id", user.id).maybeSingle());
    if (!row) fail("Profil akun belum tersedia. Periksa konfigurasi pembuatan profil di Supabase.", 409);
    if (!canAccessProfile(row)) fail("Akun ditangguhkan oleh pengelola.", 403);
    const profile = normalizeProfile({ ...row, email: row.email || user.email || "" });
    const admin = profile.role === "admin";
    if (path.startsWith("admin/") && !admin) fail("Akses admin diperlukan.", 403);
    if (path === "auth/me" && method === "GET") return ok(profile);
    if (path === "profile" && method === "PATCH") {
      const value = profileSchema.parse(body);
      if (value.faculty !== profile.faculty || value.program !== profile.program) {
        await validateAcademicSelection(client, value.faculty, value.program);
      }
      return ok(normalizeProfile(checked(await client.from("profiles").update(value).eq("id", user.id).select().single())));
    }
    if (path === "profile/password" && method === "POST") {
      const value = z.object({ password: z.string().min(8).max(128), current_password: z.string().min(1) }).parse(body);
      const verification = await client.auth.signInWithPassword({ email: user.email!, password: value.current_password });
      if (verification.error) fail("Kata sandi saat ini tidak sesuai.");
      checked(await client.auth.updateUser({ password: value.password })); return ok(true);
    }
    if (path === "auth/reset" && method === "POST") {
      const value = z.object({ password: z.string().min(8).max(128) }).parse(body);
      // A valid recovery session is established by Supabase's single-use callback.
      checked(await client.auth.updateUser(value)); return ok(true);
    }
    if (path === "schedules" && method === "GET") {
      let query = client.from("schedules").select(scheduleSelect).order("departure_at");
      if (!admin) query = query.gte("departure_at", new Date().toISOString()).neq("status", "cancelled");
      const schedules = checked(await query);
      if (!schedules.length) return ok([]);
      const availability = checked(await client.rpc("unsri_v2_schedule_capacity"));
      return ok(schedules.map(s => {
        const counts = (availability || []).find((row: { schedule_id: string }) => row.schedule_id === s.id);
        return { ...s, capacity: Number(counts?.capacity || 0), available: Number(counts?.available || 0) };
      }));
    }
    if (path.startsWith("seats/") && method === "GET") return ok(checked(await client.rpc("unsri_v2_seat_availability", { p_schedule: z.uuid().parse(path.split("/")[1]) })));
    if (path === "bookings" && method === "GET") {
      const bookings = checked(await client.from("bookings").select(bookingSelect).order("created_at", { ascending: false }));
      return ok(await attachStudentProfiles(client, bookings, profile));
    }
    if (path === "bookings" && method === "POST") {
      if (admin) fail("Hanya mahasiswa yang dapat memesan kursi.", 403);
      const b = bookingSchema.parse(body);
      const id = checked(await client.rpc("unsri_v2_reserve_seat", { p_schedule: b.schedule_id, p_seat: b.seat_id, p_pickup: b.pickup_stop_id, p_dropoff: b.dropoff_stop_id }));
      const booking = checked(await client.from("bookings").select(bookingSelect).eq("id", id).single());
      const [ticket] = await attachStudentProfiles(client, [booking], profile);
      if (!ticket) fail("Tiket tidak ditemukan.", 404);
      return ok(ticket, 201);
    }
    if (/^bookings\/[^/]+\/cancel$/.test(path) && method === "POST") {
      checked(await client.rpc("unsri_v2_cancel_booking", { p_booking: z.uuid().parse(path.split("/")[1]) })); return ok(true);
    }
    if (path === "fleet" && method === "GET") return ok(checked(await client.from("buses").select("*").order("name")));
    if (path === "routes" && method === "GET") return ok(checked(await client.from("routes").select("*,route_stops(*,stops(*))").order("name")));
    if (path === "stops" && method === "GET") return ok(checked(await client.from("stops").select("*").order("name")));
    if (path === "notifications" && method === "GET") return ok(checked(await client.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)));
    if (path === "notifications/read" && method === "POST") { checked(await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id)); return ok(true); }
    if (path === "chat/unread" && method === "GET") {
      const result = await client.from("messages").select("id", { count: "exact", head: true }).is("read_at", null).neq("sender_id", user.id);
      if (result.error) checked(result);
      return ok(result.count || 0);
    }
    if (path === "conversations" && method === "GET") {
      if (!admin) checked(await client.rpc("unsri_v2_open_conversation"));
      const conversations = checked(await client.from("conversations").select("*").order("created_at", { ascending: false }));
      const unread = checked(await client.from("messages").select("conversation_id").is("read_at", null).neq("sender_id", user.id));
      const counts = new Map<string, number>();
      for (const message of unread) counts.set(message.conversation_id, (counts.get(message.conversation_id) || 0) + 1);
      const rows = await attachStudentProfiles(client, conversations, profile);
      return ok(rows.map((conversation) => ({ ...conversation, unread_count: counts.get(conversation.id) || 0 })));
    }
    if (/^messages\/[^/]+$/.test(path)) {
      const id = z.uuid().parse(path.split("/")[1]);
      if (method === "GET") {
        checked(await client.rpc("unsri_v2_mark_messages_read", { p_conversation: id }));
        return ok(checked(await client.from("messages").select("*").eq("conversation_id", id).order("created_at").limit(300)));
      }
      if (method === "POST") {
        const value = z.object({ body: z.string().trim().min(1).max(1000) }).parse(body);
        return ok(checked(await client.rpc("unsri_v2_send_message", { p_conversation: id, p_body: value.body })), 201);
      }
    }
    if (path === "admin/students" && method === "GET") return ok(checked(await client.from("profiles").select("*").eq("role", "student").order("created_at", { ascending: false })));
    if (path === "admin/audit" && method === "GET") return ok(checked(await client.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100)));
    if (path === "admin/manage" && method === "POST") {
      const kind = z.enum(["bus","route","stop","schedule","cancel_schedule","close_conversation"]).parse(body.kind);
      const id = body.id ? z.uuid().parse(body.id) : null;
      const data = entitySchemas[kind].parse(body.data);
      return ok(checked(await client.rpc("unsri_v2_manage_entity", { p_kind: kind, p_id: id, p_data: data })));
    }
    fail("Endpoint tidak ditemukan.", 404);
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : (error as { status?: number }).status || 500;
    const message = error instanceof z.ZodError ? error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")
      : status === 500 ? "Terjadi kesalahan server. Periksa konfigurasi Supabase dan migrasi." : (error as Error).message;
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
export { handler as GET, handler as POST, handler as PATCH };
