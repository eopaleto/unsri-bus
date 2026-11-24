import { describe, expect, it } from "vitest";
import { canAccessProfile, normalizeProfile } from "../lib/auth-profile";

describe("registration without activation", () => {
  it("allows the existing profiles schema without a status column", () => {
    const row = { id: "existing-user", full_name: "Mahasiswa", role: "student" };
    expect(canAccessProfile(row as { status?: unknown })).toBe(true);
    expect(normalizeProfile(row).status).toBe("active");
  });
  it("does not require a manual activation flag", () => {
    for (const status of [undefined, null, "", "pending", "inactive", "active"]) {
      expect(canAccessProfile({ status })).toBe(true);
      expect(normalizeProfile({ status }).status).toBe("active");
    }
  });
  it("still rejects missing profiles and explicitly suspended accounts", () => {
    expect(canAccessProfile(null)).toBe(false);
    expect(canAccessProfile(undefined)).toBe(false);
    expect(canAccessProfile({ status: "suspended" })).toBe(false);
  });
  it("does not promote unknown roles to admin", () => {
    expect(normalizeProfile({ role: "admin" }).role).toBe("admin");
    for (const role of ["student", undefined, "owner", "pending"]) {
      expect(normalizeProfile({ role }).role).toBe("student");
    }
  });
});
