import type { Profile } from "./types";

/** Older installations have no status column. Registration needs no approval. */
export function canAccessProfile(profile: { status?: unknown } | null | undefined): boolean {
  return Boolean(profile) && profile?.status !== "suspended";
}

export function normalizeProfile(row: Record<string, unknown>): Profile {
  const string = (value: unknown) => typeof value === "string" ? value : "";
  return {
    id: string(row.id),
    full_name: string(row.full_name),
    nim: string(row.nim),
    email: string(row.email),
    phone: string(row.phone),
    faculty: string(row.faculty),
    program: string(row.program),
    // Authorization comes only from the database profile, never Auth metadata.
    role: row.role === "admin" ? "admin" : "student",
    status: row.status === "suspended" ? "suspended" : "active",
  };
}
