// Operational relations remain in PostgREST. Profiles are attached separately
// because legacy bookings.user_id references auth.users, not public.profiles.
export const scheduleSelect = "*,routes(*,route_stops(*,stops(*))),buses(*)";
export const bookingSelect = `*,schedules(${scheduleSelect}),schedule_seats(*),pickup:stops!bookings_pickup_stop_id_fkey(*),dropoff:stops!bookings_dropoff_stop_id_fkey(*)`;
