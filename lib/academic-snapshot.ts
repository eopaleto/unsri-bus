import snapshot from "../data/unsri-academics.json";
import type { AcademicCatalog } from "./academics";

// Public reference data bundled with the app for demo and database outages.
export const bundledAcademicCatalog: AcademicCatalog = {
  faculties: snapshot.map(({ id, name, source_url }) => ({ id, name, source_url })),
  programs: snapshot.flatMap((faculty) => faculty.programs.map((label) => {
    const [degree, ...name] = label.split(" - ");
    return {
      id: `${faculty.id}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`,
      faculty_id: faculty.id,
      label,
      degree,
      name: name.join(" - "),
    };
  })),
};
