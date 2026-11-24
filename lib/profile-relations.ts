import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";
import { normalizeProfile } from "./auth-profile";

type OwnedRecord = { student_id?: string; user_id?: string };
const ownerId = (row: OwnedRecord) => row.student_id ?? row.user_id;

/**
 * Fetch profiles through the caller's existing session. A relationship in
 * PostgREST is not required: older schemas reference auth.users instead.
 */
export async function attachStudentProfiles<T extends OwnedRecord>(
  client: SupabaseClient,
  rows: T[],
  viewer: Profile,
): Promise<(T & { profiles?: Profile })[]> {
  if (rows.length === 0) return [];
  if (viewer.role !== "admin") {
    return rows.filter(row => ownerId(row) === viewer.id).map(row => ({ ...row, profiles: viewer }));
  }
  const ids = [...new Set(rows.map(ownerId).filter((id): id is string => Boolean(id)))];
  const profiles = new Map<string, Profile>();
  // Bound each query and retain RLS; no privileged database client is used.
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { data, error } = await client.from("profiles").select("*").in("id", ids.slice(offset, offset + 100));
    if (error) throw Object.assign(new Error(error.message), { code: error.code, status: 400 });
    for (const row of data || []) profiles.set(row.id, normalizeProfile(row));
  }
  return rows.map(row => ({ ...row, profiles: profiles.get(ownerId(row) || "") }));
}
