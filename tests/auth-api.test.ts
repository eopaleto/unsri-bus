import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => {
  const profile = vi.fn();
  return {
    profile,
    client: {
      from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: profile }) }) })),
      auth: { getUser: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn() },
    },
  };
});
vi.mock("../lib/supabase/server", () => ({
  configured: () => true,
  supabaseServer: async () => mocks.client,
}));
import { GET, POST } from "../app/api/[...path]/route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: "student-1" } }, error: null });
  mocks.client.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
  mocks.profile.mockResolvedValue({ data: { id: "student-1", full_name: "Mahasiswa Uji", role: "student" }, error: null });
});
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
const req = (path: string, body?: object) => new NextRequest(`http://localhost:3001/api/${path}`, {
  method: body ? "POST" : "GET", headers: { origin: "http://localhost:3001", "content-type": "application/json" },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
describe("login regression: schema without profiles.status", () => {
  it("returns the profile after a successful login instead of an inactive-account error", async () => {
    expect((await POST(req("auth/login", { email: "student@example.com", password: "Test123!" }), context("auth/login"))).status).toBe(200);
    const response = await GET(req("auth/me"), context("auth/me"));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ id: "student-1", role: "student", status: "active" });
  });
  it("does not allow students into admin endpoints after removing activation", async () => {
    const response = await GET(req("admin/students"), context("admin/students"));
    expect(response.status).toBe(403);
  });
  it("keeps anonymous requests and suspended users blocked", async () => {
    mocks.client.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await GET(req("auth/me"), context("auth/me"))).status).toBe(401);
    mocks.profile.mockResolvedValueOnce({ data: { id: "student-1", status: "suspended" }, error: null });
    expect((await GET(req("auth/me"), context("auth/me"))).status).toBe(403);
  });
  it("registers directly without asking the user to activate their account", async () => {
    mocks.client.auth.signUp.mockResolvedValue({ data: { session: { access_token: "test" } }, error: null });
    const response = await POST(req("auth/register", {
      full_name: "Mahasiswa Uji", nim: "09011282628099", email: "test@example.com", password: "Test123!", consent: true,
    }), context("auth/register"));
    expect(response.status).toBe(201);
    expect((await response.json()).data.message).toBe("Pendaftaran berhasil. Akun dapat langsung digunakan.");
  });
  it("reports a missing profile separately from suspended or unactivated accounts", async () => {
    mocks.profile.mockResolvedValueOnce({ data: null, error: null });
    const response = await GET(req("auth/me"), context("auth/me"));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("Profil akun belum tersedia");
  });
  it("reports signup database failures clearly and does not retry signup", async () => {
    mocks.client.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "unexpected_failure", message: "Database error saving new user" },
    });
    const response = await POST(req("auth/register", {
      full_name: "Mahasiswa Uji", nim: "09011282628099", email: "test@example.com", password: "Test123!", consent: true,
    }), context("auth/register"));
    expect(response.status).toBe(409);
    const message = (await response.json()).error;
    expect(message).toContain("unexpected_failure");
    expect(message).toContain("REPAIR_SIGNUP.sql");
    expect(mocks.client.auth.signUp).toHaveBeenCalledTimes(1);
  });
});
