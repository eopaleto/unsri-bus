export type AcademicProgram = { id: string; faculty_id: string; name: string; degree: string; label: string };
export type AcademicFaculty = { id: string; name: string; source_url: string };
export type AcademicCatalog = { faculties: AcademicFaculty[]; programs: AcademicProgram[] };

export function programsForFaculty(catalog: AcademicCatalog, facultyName: string) {
  const faculty = catalog.faculties.find((f) => f.name === facultyName);
  return catalog.programs.filter((p) => p.faculty_id === faculty?.id);
}
export function validAcademicPair(catalog: AcademicCatalog, faculty: string, program: string) {
  return (!faculty && !program) || programsForFaculty(catalog, faculty).some((p) => p.label === program);
}
