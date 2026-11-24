import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ from: vi.fn(), signUp: vi.fn() }));
vi.mock("../lib/supabase/server", () => ({
  configured: () => true,
  supabaseServer: async () => ({ from: mocks.from, auth: { signUp: mocks.signUp } }),
}));
import { GET, POST } from "../app/api/[...path]/route";
import { bundledAcademicCatalog } from "../lib/academic-snapshot";
import { validAcademicPair } from "../lib/academics";

type Result = { data: unknown; error: { code: string } | null };
function databaseResults(faculties: Result, programs: Result) {
  mocks.from.mockImplementation((table: string) => {
    const result = Promise.resolve(table === "academic_faculties" ? faculties : programs);
    const query = Object.assign(result, { order: () => query });
    return { select: () => query };
  });
}
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
async function getCatalog() {
  return GET(new NextRequest("http://localhost:3000/api/academics"), context("academics"));
}
const live = {
  faculties: [{ id: "live", name: "Fakultas Live", source_url: "https://example.com" }],
  programs: [{ id: "live-p", faculty_id: "live", name: "Program Live", degree: "S1", label: "S1 - Program Live" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  databaseResults({ data: live.faculties, error: null }, { data: live.programs, error: null });
});
afterEach(() => { vi.restoreAllMocks(); });

describe("public academic catalogue availability", () => {
  it("prefers the live database catalogue when both queries succeed", async () => {
    const response = await getCatalog();
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(live);
  });

  it.each(["PGRST205", "42P01", "42501", ""])("serves the bundled catalogue when Supabase fails with %s", async (code) => {
    databaseResults({ data: null, error: { code } }, { data: live.programs, error: null });
    const response = await getCatalog();
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(bundledAcademicCatalog);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("falls back for a program query failure without mixing sources", async () => {
    databaseResults({ data: live.faculties, error: null }, { data: null, error: { code: "PGRST205" } });
    expect((await (await getCatalog()).json()).data).toEqual(bundledAcademicCatalog);
  });

  it.each(["faculties", "programs"])("uses the complete snapshot when %s is empty", async (empty) => {
    databaseResults(
      { data: empty === "faculties" ? [] : live.faculties, error: null },
      { data: empty === "programs" ? [] : live.programs, error: null },
    );
    expect((await (await getCatalog()).json()).data).toEqual(bundledAcademicCatalog);
  });

  it("handles thrown database requests", async () => {
    mocks.from.mockImplementation(() => { throw new TypeError("fetch failed"); });
    const response = await getCatalog();
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(bundledAcademicCatalog);
  });

  it("bundles every programme with a valid faculty and unique migration-compatible ID", () => {
    const catalog = bundledAcademicCatalog;
    expect(catalog.faculties).toHaveLength(11);
    expect(catalog.programs).toHaveLength(122);
    expect(new Set(catalog.programs.map(p => p.id)).size).toBe(catalog.programs.length);
    for (const program of catalog.programs) {
      const faculty = catalog.faculties.find(f => f.id === program.faculty_id);
      expect(faculty).toBeDefined();
      expect(validAcademicPair(catalog, faculty!.name, program.label)).toBe(true);
    }
    expect(catalog.programs.find(p => p.label === "S1 - Teknik Sipil")?.id).toBe("ft-s1-teknik-sipil");
  });

  it.each([
    { program: "S1 - Teknik Sipil", status: 201, signup: 1 },
    { program: "S1 - Ilmu Hukum", status: 400, signup: 0 },
  ])("validates signup faculty/program pairs during an outage: $status", async ({ program, status, signup }) => {
    databaseResults({ data: null, error: { code: "PGRST205" } }, { data: null, error: { code: "PGRST205" } });
    mocks.signUp.mockResolvedValue({ data: { session: {} }, error: null });
    const response = await POST(new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ full_name: "Mahasiswa Uji", nim: "09011282628099", email: "test@example.com", password: "Test123!", consent: true,
        faculty: "Fakultas Teknik", program }),
    }), context("auth/register"));
    expect(response.status).toBe(status);
    expect(mocks.signUp).toHaveBeenCalledTimes(signup);
  });
});
