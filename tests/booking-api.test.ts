import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

vi.mock("../lib/supabase/server", () => ({
  configured: () => true,
  supabaseServer: async () => mocks.client,
}));

import { GET, POST } from "../app/api/[...path]/route";

type QueryResult = { data: unknown; error: null | { message: string; code: string } };
function fakeQuery(data: unknown) {
  const result: QueryResult = { data, error: null };
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    gte: vi.fn(),
    neq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of ["select", "eq", "in", "order", "gte", "neq", "is"] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}

const student = { id: "student-1", full_name: "Mahasiswa Pertama", role: "student" };
const admin = { id: "admin-1", full_name: "Administrator", role: "admin" };
let queries: Record<string, ReturnType<typeof fakeQuery>>;
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
const request = (path: string, body?: object) => new NextRequest(`http://localhost:3001/api/${path}`, {
  method: body ? "POST" : "GET",
  headers: { origin: "http://localhost:3001", "content-type": "application/json" },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

function signIn(profile: typeof student) {
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: profile.id } }, error: null });
  queries.profiles.maybeSingle.mockResolvedValue({ data: profile, error: null });
}

function expectCompatibleBookingSelect() {
  expect(queries.bookings.select).toHaveBeenCalledTimes(1);
  const selection = queries.bookings.select.mock.calls[0][0] as string;
  expect(selection).not.toContain("profiles");
  expect(selection).toContain("schedule_seats(*)");
  expect(selection).not.toContain("schedule_seats(seat_label)");
}

beforeEach(() => {
  vi.clearAllMocks();
  queries = Object.fromEntries(
    ["profiles", "bookings", "conversations", "messages", "schedules", "buses"].map((name) => [name, fakeQuery([])]),
  );
  mocks.client.from.mockImplementation((table: string) => {
    if (!queries[table]) throw new Error(`Unexpected table: ${table}`);
    return queries[table];
  });
  mocks.client.rpc.mockResolvedValue({ data: null, error: null });
  signIn(student);
});

describe("booking API compatibility with legacy Supabase relationships", () => {
  it("lists legacy user_id bookings with the signed-in profile and omits foreign bookings", async () => {
    queries.bookings = fakeQuery([
      { id: "booking-own", user_id: student.id, schedule_seats: { id: "seat-1" } },
      { id: "booking-other", user_id: "student-2" },
    ]);

    const response = await GET(request("bookings"), context("bookings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: "booking-own",
      user_id: student.id,
      profiles: { id: student.id, full_name: student.full_name, status: "active" },
    });
    expectCompatibleBookingSelect();
    expect(queries.profiles.in).not.toHaveBeenCalled();
  });

  it("fetches administrator booking profiles independently and matches them by owner ID", async () => {
    const otherStudent = { id: "student-2", full_name: "Mahasiswa Kedua", role: "student" };
    queries.profiles = fakeQuery([otherStudent, student]);
    queries.bookings = fakeQuery([
      { id: "booking-1", user_id: student.id },
      { id: "booking-2", user_id: otherStudent.id },
      { id: "booking-3", user_id: student.id },
    ]);
    signIn(admin);

    const response = await GET(request("bookings"), context("bookings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((row: { profiles: { id: string } }) => row.profiles.id)).toEqual([
      student.id, otherStudent.id, student.id,
    ]);
    expectCompatibleBookingSelect();
    expect(queries.profiles.in).toHaveBeenCalledExactlyOnceWith("id", [student.id, otherStudent.id]);
    expect(queries.profiles.select.mock.calls).toEqual([["*"], ["*"]]);
    expect(mocks.client.from.mock.calls.filter(([table]) => table === "profiles")).toHaveLength(2);
  });

  it("returns a newly reserved legacy booking without requesting a profiles relationship", async () => {
    const body = {
      schedule_id: "10000000-0000-4000-8000-000000000001",
      seat_id: "10000000-0000-4000-8000-000000000002",
      pickup_stop_id: "10000000-0000-4000-8000-000000000003",
      dropoff_stop_id: "10000000-0000-4000-8000-000000000004",
    };
    const bookingId = "10000000-0000-4000-8000-000000000005";
    mocks.client.rpc.mockResolvedValue({ data: bookingId, error: null });
    queries.bookings.single.mockResolvedValue({
      data: { id: bookingId, user_id: student.id, schedule_seats: { id: body.seat_id } },
      error: null,
    });

    const response = await POST(request("bookings", body), context("bookings"));

    expect(response.status).toBe(201);
    expect((await response.json()).data).toMatchObject({
      id: bookingId, user_id: student.id, profiles: { id: student.id },
    });
    expect(mocks.client.rpc).toHaveBeenCalledExactlyOnceWith("unsri_v2_reserve_seat", {
      p_schedule: body.schedule_id,
      p_seat: body.seat_id,
      p_pickup: body.pickup_stop_id,
      p_dropoff: body.dropoff_stop_id,
    });
    expect(queries.bookings.eq).toHaveBeenCalledExactlyOnceWith("id", bookingId);
    expectCompatibleBookingSelect();
    expect(queries.profiles.in).not.toHaveBeenCalled();
  });

  it.each(["student", "admin"] as const)(
    "loads conversations as %s without embedding a profiles relationship",
    async (role) => {
      queries.profiles = fakeQuery([student]);
      queries.conversations = fakeQuery([{ id: "conversation-1", student_id: student.id }]);
      queries.messages = fakeQuery([
        { conversation_id: "conversation-1" },
        { conversation_id: "conversation-1" },
      ]);
      signIn(role === "admin" ? admin : student);

      const response = await GET(request("conversations"), context("conversations"));

      expect(response.status).toBe(200);
      expect((await response.json()).data).toMatchObject([
        { id: "conversation-1", unread_count: 2, profiles: { id: student.id, full_name: student.full_name } },
      ]);
      expect(queries.conversations.select).toHaveBeenCalledExactlyOnceWith("*");
      if (role === "student") {
        expect(mocks.client.rpc).toHaveBeenCalledExactlyOnceWith("unsri_v2_open_conversation");
        expect(queries.profiles.in).not.toHaveBeenCalled();
      } else {
        expect(mocks.client.rpc).not.toHaveBeenCalled();
        expect(queries.profiles.in).toHaveBeenCalledExactlyOnceWith("id", [student.id]);
      }
    },
  );

  it("returns an empty schedule without calling a missing schedule_capacity RPC", async () => {
    mocks.client.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function public.schedule_capacity" },
    });

    const response = await GET(request("schedules"), context("schedules"));

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual([]);
    expect(mocks.client.rpc).not.toHaveBeenCalled();
  });

  it("loads fleet records ordered by name without requiring a code column", async () => {
    const bus = { id: "bus-1", name: "Bus Kampus", status: "operating" };
    queries.buses = fakeQuery([bus]);

    const response = await GET(request("fleet"), context("fleet"));

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual([bus]);
    expect(queries.buses.order).toHaveBeenCalledExactlyOnceWith("name");
    expect(queries.buses.select).toHaveBeenCalledExactlyOnceWith("*");
  });
});
