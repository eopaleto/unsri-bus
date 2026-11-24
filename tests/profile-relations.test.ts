import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { normalizeProfile } from "../lib/auth-profile";
import { attachStudentProfiles } from "../lib/profile-relations";

const student = normalizeProfile({
  id: "student-1",
  full_name: "Mahasiswa Pertama",
  role: "student",
});
const admin = normalizeProfile({
  id: "admin-1",
  full_name: "Administrator",
  role: "admin",
});

function fakeClient(
  data: Record<string, unknown>[] | null = [],
  error: { message: string; code?: string } | null = null,
) {
  const inFilter = vi.fn().mockResolvedValue({ data, error });
  const select = vi.fn(() => ({ in: inFilter }));
  const from = vi.fn(() => ({ select }));
  return {
    client: { from } as unknown as SupabaseClient,
    from,
    select,
    inFilter,
  };
}

describe("profile attachment without PostgREST relationships", () => {
  it("attaches the signed-in student's profile to their bookings without another lookup", async () => {
    const db = fakeClient();
    const rows = [
      { id: "booking-1", student_id: student.id, status: "confirmed" },
      { id: "booking-2", student_id: student.id, status: "cancelled" },
    ];

    expect(await attachStudentProfiles(db.client, rows, student)).toEqual(
      rows.map((row) => ({ ...row, profiles: student })),
    );
    expect(db.from).not.toHaveBeenCalled();
    expect(rows[0]).not.toHaveProperty("profiles");
  });

  it("omits foreign and ownerless rows instead of assigning the viewer to another student", async () => {
    const db = fakeClient();
    const own = { id: "booking-own", student_id: student.id };
    const rows = [
      own,
      { id: "booking-foreign", student_id: "student-2" },
      { id: "booking-unknown" },
      { id: "booking-conflicting", student_id: "student-2", user_id: student.id },
    ];

    expect(await attachStudentProfiles(db.client, rows, student)).toEqual([
      { ...own, profiles: student },
    ]);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("accepts legacy user_id ownership when student_id is absent", async () => {
    const db = fakeClient();
    const own = { id: "booking-legacy", user_id: student.id };
    const foreign = { id: "booking-foreign", user_id: "student-2" };

    expect(await attachStudentProfiles(db.client, [own, foreign], student)).toEqual([
      { ...own, profiles: student },
    ]);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("matches administrator results by student ID and batch-fetches each profile once", async () => {
    const firstProfile = { id: "student-1", full_name: "Mahasiswa Pertama", role: "student" };
    const secondProfile = { id: "student-2", full_name: "Mahasiswa Kedua", role: "student" };
    const db = fakeClient([secondProfile, firstProfile]);
    const rows = [
      { id: "booking-1", student_id: "student-1" },
      { id: "booking-2", student_id: "student-2" },
      { id: "booking-3", student_id: "student-1" },
    ];
    const result = await attachStudentProfiles(db.client, rows, admin);

    expect(db.from).toHaveBeenCalledExactlyOnceWith("profiles");
    expect(db.select).toHaveBeenCalledExactlyOnceWith("*");
    expect(db.inFilter).toHaveBeenCalledExactlyOnceWith("id", ["student-1", "student-2"]);
    expect(result).toEqual([
      { ...rows[0], profiles: normalizeProfile(firstProfile) },
      { ...rows[1], profiles: normalizeProfile(secondProfile) },
      { ...rows[2], profiles: normalizeProfile(firstProfile) },
    ]);
    expect(result[0].profiles).toMatchObject({ status: "active", phone: "", faculty: "" });
  });

  it("resolves legacy user_id rows for administrators", async () => {
    const profile = { id: "student-2", full_name: "Mahasiswa Kedua", role: "student" };
    const db = fakeClient([profile]);
    const row = { id: "booking-legacy", user_id: "student-2" };

    expect(await attachStudentProfiles(db.client, [row], admin)).toEqual([
      { ...row, profiles: normalizeProfile(profile) },
    ]);
    expect(db.inFilter).toHaveBeenCalledExactlyOnceWith("id", ["student-2"]);
  });

  it("keeps missing profiles undefined and never substitutes the administrator", async () => {
    const db = fakeClient([{ id: "student-1", full_name: "Mahasiswa Pertama" }]);
    const rows = [
      { id: "booking-1", student_id: "student-1" },
      { id: "booking-missing", student_id: "student-2" },
    ];
    const result = await attachStudentProfiles(db.client, rows, admin);

    expect(result).toHaveLength(2);
    expect(result[0].profiles?.id).toBe("student-1");
    expect(result[1].id).toBe("booking-missing");
    expect(result[1].profiles).toBeUndefined();
  });

  it("preserves profile-fetch errors rather than returning misleading partial data", async () => {
    const db = fakeClient(null, { message: "permission denied for table profiles", code: "42501" });

    await expect(
      attachStudentProfiles(db.client, [{ id: "booking-1", student_id: "student-1" }], admin),
    ).rejects.toMatchObject({ message: "permission denied for table profiles" });
  });

  it.each([student, admin])("skips profile queries for empty results as $role", async (viewer) => {
    const db = fakeClient();

    expect(await attachStudentProfiles(db.client, [], viewer)).toEqual([]);
    expect(db.from).not.toHaveBeenCalled();
  });
});
