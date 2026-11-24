import { z } from "zod";
export const registerSchema = z.object({
  full_name: z.string().trim().min(3).max(80), nim: z.string().regex(/^\d{7,20}$/),
  email: z.email().max(140), password: z.string().min(8).max(128),
  faculty: z.string().max(100).default(""), program: z.string().max(100).default(""),
  consent: z.literal(true),
}).strict();
export const bookingSchema = z.object({
  schedule_id: z.uuid(), seat_id: z.uuid(), pickup_stop_id: z.uuid(), dropoff_stop_id: z.uuid(),
}).strict().refine(v => v.pickup_stop_id !== v.dropoff_stop_id, { message: "Halte jemput dan turun harus berbeda." });
export const profileSchema = z.object({
  full_name: z.string().trim().min(3).max(80), phone: z.string().regex(/^[+\d\s()-]*$/).max(25),
  faculty: z.string().max(100), program: z.string().max(100),
}).strict();
const text = z.string().trim().min(2).max(100);
export const entitySchemas = {
  bus: z.object({ code: text, name: text, plate_number: text, capacity: z.coerce.number().int().min(4).max(60), status: z.enum(["operating","maintenance","inactive"]) }).strict(),
  stop: z.object({ name: text, description: z.string().max(300), is_active: z.boolean().default(true) }).strict(),
  route: z.object({
    name: text, origin: text, destination: text, is_active: z.boolean().default(true),
    stops: z.array(z.object({ stop_id: z.uuid(), pickup_allowed: z.boolean(), dropoff_allowed: z.boolean() })).min(2).max(30),
  }).strict().refine(v => new Set(v.stops.map(s => s.stop_id)).size === v.stops.length && v.origin !== v.destination, { message: "Rute atau urutan halte tidak valid." }),
  schedule: z.object({ route_id: z.uuid(), bus_id: z.uuid(), departure_at: z.iso.datetime({ offset: true }), arrival_at: z.iso.datetime({ offset: true }), fare_idr: z.coerce.number().int().min(0).max(1000000) }).strict(),
  cancel_schedule: z.object({ reason: z.string().trim().min(5).max(300) }).strict(),
  close_conversation: z.object({}).strict(),
};
