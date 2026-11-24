import type { SupabaseClient } from "@supabase/supabase-js";
import type { AcademicCatalog } from "./academics";
import { validAcademicPair } from "./academics";
import { bundledAcademicCatalog } from "./academic-snapshot";

export async function academicCatalog(client: SupabaseClient): Promise<AcademicCatalog> {
  try {
    const [faculties, programs] = await Promise.all([
      client.from("academic_faculties").select("id,name,source_url").order("sort_order"),
      client.from("academic_programs").select("id,faculty_id,name,degree,label").order("degree").order("name"),
    ]);
    if (!faculties.error && !programs.error && faculties.data?.length && programs.data?.length) {
      return { faculties: faculties.data, programs: programs.data };
    }
    console.warn("[academics] Using bundled catalog:", faculties.error?.code || programs.error?.code || "empty catalog");
  } catch {
    console.warn("[academics] Using bundled catalog: database request failed");
  }
  // Keep the two tables from the same source so faculty/program pairs stay valid.
  return bundledAcademicCatalog;
}

export async function validateAcademicSelection(client: SupabaseClient, faculty: string, program: string) {
  if (!faculty && !program) return;
  if (!validAcademicPair(await academicCatalog(client), faculty, program)) {
    throw Object.assign(Error("Pilih fakultas dan program studi UNSRI yang sesuai."), { status: 400 });
  }
}
