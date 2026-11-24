import { describe, expect, it } from "vitest";
import { features, searchFeatures } from "../lib/navigation";
describe("global feature discovery", () => {
  it("finds settings, identity, help and bookings beyond schedules", () => {
    expect(searchFeatures("password", false).map((f) => f.id)).toContain("settings");
    expect(searchFeatures("program studi", false).map((f) => f.id)).toContain("profile");
    expect(searchFeatures("bantuan", false).map((f) => f.id)).toContain("chat");
    expect(searchFeatures("tiket", false).map((f) => f.id)).toContain("orders");
  });
  it("covers each visible student menu and the account actions", () => {
    expect(searchFeatures("", false).map((f) => f.id)).toEqual(expect.arrayContaining([
      "dashboard", "orders", "schedules", "chat", "profile", "settings", "logout", "notifications", "fleet",
    ]));
  });
  it("never exposes admin menus to students and routes admin results to the right tab", () => {
    expect(searchFeatures("kelola", false)).toHaveLength(0);
    expect(searchFeatures("kelola halte", true)[0]).toMatchObject({ page: "manage", tab: "stop" });
    expect(searchFeatures("mahasiswa", true).map((f) => f.id)).toContain("students");
  });
  it("handles whitespace, case and unknown searches", () => {
    expect(searchFeatures("  KATA   SANDI ", false).map((f) => f.id)).toContain("settings");
    expect(searchFeatures("xyznonexistent", false)).toEqual([]);
    expect(new Set(features.map((f) => f.id)).size).toBe(features.length);
  });
});
