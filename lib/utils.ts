export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const dateKey = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
export const dateLabel = (value: string, short = false) => new Date(value.length === 10 ? value + "T12:00:00+07:00" : value).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", ...(short ? {} : { weekday: "long" }), day: "numeric", month: short ? "short" : "long", year: "numeric" });
export const timeLabel = (value: string) => new Date(value).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");
export const money = (value: number) => value === 0 ? "Gratis" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
export const addDays = (value: string, days: number) => new Date(new Date(value + "T12:00:00Z").getTime() + days * 86400000).toISOString().slice(0, 10);
export const bookable = (schedule: { status: string; departure_at: string; available: number }, now = Date.now()) => schedule.status === "scheduled" && schedule.available > 0 && new Date(schedule.departure_at).getTime() - now > 30 * 60 * 1000;
export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(s => s[0]).join("").toUpperCase();
