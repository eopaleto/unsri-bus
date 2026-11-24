import type { Booking, Bus, Profile, Route, Schedule, Seat, Stop } from "./types";
import { addDays, today } from "./utils";
export const demoProfile: Profile = { id: "demo-student", full_name: "Budi Santoso", nim: "09011282628001", email: "budi@example.com", phone: "", faculty: "Fakultas Ilmu Komputer", program: "Sistem Informasi", role: "student", status: "active" };
export const demoStops: Stop[] = [
  { id: "stop-1", name: "Halte FISIP", description: "Kampus Indralaya" },
  { id: "stop-2", name: "Halte Bukit Besar", description: "Kampus Palembang" },
];
export const demoRoutes: Route[] = [
  { id: "route-1", name: "Indralaya → Bukit Besar", origin: "Kampus Indralaya", destination: "Bukit Besar", is_active: true,
    route_stops: demoStops.map((s,i) => ({ stop_id: s.id, stop_order: i+1, pickup_allowed: i===0, dropoff_allowed: i===1, stops: s })) },
  { id: "route-2", name: "Bukit Besar → Indralaya", origin: "Bukit Besar", destination: "Kampus Indralaya", is_active: true,
    route_stops: [...demoStops].reverse().map((s,i) => ({ stop_id: s.id, stop_order: i+1, pickup_allowed: i===0, dropoff_allowed: i===1, stops: s })) },
];
export const demoBuses: Bus[] = Array.from({length:5},(_,i)=>({
  id:`bus-${i}`, code:`UB-0${i+1}`, name:`UNSRI Bus 0${i+1}`, plate_number:`BG DEMO ${i+1}`,
  capacity:40, status:i===4?"maintenance":"operating",
}));
export function demoSchedules(): Schedule[] {
  return Array.from({length:8},(_,d)=>[8,12,16,18].map((hour,i)=>({
    id:`trip-${d}-${i}`, route_id:demoRoutes[i%2].id, bus_id:demoBuses[i].id,
    departure_at:`${addDays(today(),d)}T${String(hour).padStart(2,"0")}:00:00+07:00`,
    arrival_at:`${addDays(today(),d)}T${String(hour+1).padStart(2,"0")}:15:00+07:00`,fare_idr:5000,status:"scheduled",
    routes:demoRoutes[i%2],buses:demoBuses[i],capacity:40,available:[12,20,25,18][i],
  }))).flat();
}
export const demoSeats = (s: Schedule): Seat[] => Array.from({length:40},(_,i)=>({
  id:`${s.id}-seat-${i}`,seat_label:`${"ABCD"[i%4]}${Math.floor(i/4)+1}`,row_no:Math.floor(i/4)+1,col_no:i%4+1,occupied:i>=s.available,
}));
export function demoBooking(schedules: Schedule[]): Booking[] {
  const s = schedules.find(s=>new Date(s.departure_at).getTime()>Date.now()+3600000);
  return s ? [{ id:"demo-ticket",booking_code:"DEMO-UNSRI-001",student_id:demoProfile.id,status:"confirmed",created_at:new Date().toISOString(),schedules:s,schedule_seats:{seat_label:"B2"},pickup:s.routes.route_stops[0].stops,dropoff:s.routes.route_stops[1].stops,profiles:demoProfile }] : [];
}
