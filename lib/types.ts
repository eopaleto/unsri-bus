export type Profile = {
  id: string; full_name: string; nim: string; email: string; phone: string;
  faculty: string; program: string; role: "student" | "admin"; status: string;
};
export type Stop = { id: string; name: string; description: string };
export type RouteStop = { stop_id: string; stop_order: number; pickup_allowed: boolean; dropoff_allowed: boolean; stops: Stop };
export type Route = { id: string; name: string; origin: string; destination: string; is_active: boolean; route_stops: RouteStop[] };
export type Bus = { id: string; code: string; name: string; plate_number: string; capacity: number; status: string };
export type Schedule = {
  id: string; route_id: string; bus_id: string; departure_at: string; arrival_at: string;
  fare_idr: number; status: string; routes: Route; buses: Bus; available: number; capacity: number;
};
export type Seat = { id: string; seat_label: string; row_no: number; col_no: number; occupied: boolean };
export type Booking = {
  id: string; booking_code: string; student_id: string; status: string; created_at: string;
  schedules: Schedule; schedule_seats: { seat_label: string };
  pickup: Stop; dropoff: Stop; profiles?: Profile;
};
export type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
export type Conversation = { id: string; student_id: string; status: string; unread_count?: number; profiles?: Profile };
export type Notice = { id: string; title: string; body: string; read_at: string | null; created_at: string };
