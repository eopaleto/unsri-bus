import {
  ArrowLeft,
  ArrowRight,
  Armchair,
  BusFront,
  CalendarDays,
  ChevronRight,
  Clock3,
  Headphones,
  MapPin,
  ScanLine,
  Ticket,
  Users,
} from "lucide-react";
import type { Booking, Bus, Schedule } from "@/lib/types";
import {
  addDays,
  bookable,
  dateKey,
  dateLabel,
  money,
  timeLabel,
} from "@/lib/utils";
import { BusIllustration } from "./illustration";
export function WeekCalendar({
  selected,
  setSelected,
  offset,
  setOffset,
  currentDay,
  compact = false,
}: {
  selected: string;
  setSelected: (s: string) => void;
  offset: number;
  setOffset: (n: number) => void;
  currentDay: string;
  compact?: boolean;
}) {
  const start = addDays(currentDay, offset);
  return (
    <div className={compact ? "week mobile-week" : "panel calendar-panel"}>
      {!compact && (
        <>
          <h2>
            <CalendarDays size={19} /> Kalender
          </h2>
          <div className="calendar-month">
            <span>
              {new Date(start + "T12:00:00+07:00").toLocaleDateString("id-ID", {
                timeZone: "Asia/Jakarta",
                month: "long",
                year: "numeric",
              })}
            </span>
            <div>
              <button
                onClick={() => {
                  setOffset(0);
                  setSelected(currentDay);
                }}
              >
                Hari ini
              </button>
              <button
                aria-label="Minggu sebelumnya"
                onClick={() => setOffset(offset - 7)}
              >
                <ArrowLeft size={14} />
              </button>
              <button
                aria-label="Minggu berikutnya"
                onClick={() => setOffset(offset + 7)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
      <div className="week-days">
        {Array.from({ length: 7 }, (_, i) => {
          const day = addDays(start, i);
          return (
            <button
              key={day}
              onClick={() => setSelected(day)}
              className={day === selected ? "selected" : ""}
              aria-pressed={day === selected}
              aria-label={dateLabel(day)}
            >
              <span>
                {new Date(day + "T12:00:00+07:00")
                  .toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "short" })
                  .slice(0, 3)}
              </span>
              <strong>{Number(day.slice(-2))}</strong>
              {day === currentDay && <i />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export function TripHero({
  booking,
  onTicket,
  onSearch,
}: {
  booking?: Booking;
  onTicket: (b: Booking) => void;
  onSearch: () => void;
}) {
  const s = booking?.schedules;
  return (
    <section className={`trip-hero ${!booking ? "hero-empty" : ""}`}>
      <div className="hero-circle" />
      <BusFront className="hero-bus" strokeWidth={1.3} />
      <div className="trip-hero-top">
        <span className="next-label">Keberangkatan Berikutnya</span>
        {booking && (
          <span className="active-pill">
            <i /> Aktif
          </span>
        )}
      </div>
      {booking && s ? (
        <>
          <h2>
            {s.routes.origin} <ArrowRight /> {s.routes.destination}
          </h2>
          <p className="hero-service">
            Bus Reguler <span>•</span> {s.buses.name}
          </p>
          <div className="hero-details">
            <div>
              <Clock3 />
              <span>Berangkat</span>
              <strong>
                {timeLabel(s.departure_at)} <small>WIB</small>
              </strong>
              <em>{dateLabel(s.departure_at, true)}</em>
            </div>
            <div>
              <MapPin />
              <span>Titik Jemput</span>
              <strong>{booking.pickup.name}</strong>
              <em>{s.routes.origin}</em>
            </div>
            <div>
              <Armchair />
              <span>Nomor Kursi</span>
              <strong className="seat-tag">
                {booking.schedule_seats.seat_label}
              </strong>
            </div>
            <div>
              <Users />
              <span>Status</span>
              <strong>
                Sudah
                <br className="mobile-break" /> Dipesan
              </strong>
            </div>
          </div>
          <button className="ticket-cta" onClick={() => onTicket(booking)}>
            <span>
              <ScanLine /> Lihat Tiket Saya
            </span>
            <ChevronRight size={19} />
          </button>
        </>
      ) : (
        <>
          <h2>Belum ada perjalanan.</h2>
          <p className="hero-service">
            Kampus menanti. Temukan jadwal dan pilih kursimu.
          </p>
          <div className="empty-hero-space">
            <BusIllustration />
          </div>
          <button className="ticket-cta" onClick={onSearch}>
            <span>
              <CalendarDays /> Cari Jadwal Bus
            </span>
            <ChevronRight size={19} />
          </button>
        </>
      )}
    </section>
  );
}
export function ScheduleTable({
  schedules,
  onBook,
  onAll,
  now,
}: {
  schedules: Schedule[];
  onBook: (s: Schedule) => void;
  onAll: () => void;
  now: number;
}) {
  return (
    <section className="panel available-panel">
      <div className="panel-heading">
        <div>
          <h2>Jadwal Tersedia</h2>
          <p>Pilih rute dan jadwal perjalanan Anda</p>
        </div>
        <button className="text-link" onClick={onAll}>
          Lihat Semua Jadwal <ChevronRight size={15} />
        </button>
      </div>
      {schedules.length ? (
        <div className="table-scroll">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Keberangkatan</th>
                <th>Rute</th>
                <th>Titik Jemput</th>
                <th>Tipe Bus</th>
                <th>Kursi Tersedia</th>
                <th>Info Tarif</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {schedules.slice(0, 5).map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{timeLabel(s.departure_at)}</strong>{" "}
                    <small>WIB</small>
                  </td>
                  <td>
                    {s.routes.origin.replace("Kampus ", "")} →{" "}
                    {s.routes.destination.replace("Kampus ", "")}
                  </td>
                  <td>
                    {s.routes.route_stops.find((r) => r.pickup_allowed)?.stops
                      .name || "—"}
                  </td>
                  <td>
                    <span className="tag green">Reguler</span>
                  </td>
                  <td>
                    <strong>{s.available}</strong> / {s.capacity}
                  </td>
                  <td>
                    <strong>{money(s.fare_idr)}</strong>
                  </td>
                  <td>
                    <button
                      className="button primary small"
                      disabled={!bookable(s, now)}
                      onClick={() => onBook(s)}
                    >
                      {bookable(s, now)
                        ? "Pesan"
                        : s.available === 0
                          ? "Penuh"
                          : "Ditutup"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="inline-empty">
          <CalendarDays />
          <h3>Belum ada jadwal pada tanggal ini</h3>
          <p>Pilih tanggal lain pada kalender atau lihat semua jadwal.</p>
          <button className="text-link" onClick={onAll}>
            Cari jadwal lainnya <ArrowRight size={15} />
          </button>
        </div>
      )}
    </section>
  );
}
export function Dashboard({
  bookings,
  schedules,
  buses,
  selected,
  setSelected,
  offset,
  setOffset,
  navigate,
  onBook,
  onTicket,
  onFleet,
  now,
  currentDay,
}: {
  bookings: Booking[];
  schedules: Schedule[];
  buses: Bus[];
  selected: string;
  setSelected: (s: string) => void;
  offset: number;
  setOffset: (n: number) => void;
  navigate: (page: string) => void;
  onBook: (s: Schedule) => void;
  onTicket: (b: Booking) => void;
  onFleet: () => void;
  now: number;
  currentDay: string;
}) {
  const upcoming = bookings
    .filter(
      (b) =>
        b.status === "confirmed" &&
        b.schedules.status !== "cancelled" &&
        new Date(b.schedules.departure_at).getTime() > now,
    )
    .sort((a, b) =>
      a.schedules.departure_at.localeCompare(b.schedules.departure_at),
    )[0];
  const daySchedules = schedules.filter(
    (s) => dateKey(s.departure_at) === selected && s.status !== "cancelled",
  );
  const operating = buses.filter((b) => b.status === "operating").length,
    maintenance = buses.filter((b) => b.status === "maintenance").length;
  const percent = buses.length
    ? Math.round((operating / buses.length) * 100)
    : 0;
  return (
    <>
      <WeekCalendar
        compact
        selected={selected}
        setSelected={setSelected}
        offset={offset}
        setOffset={setOffset}
      currentDay={currentDay}
      />
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <TripHero
            booking={upcoming}
            onTicket={onTicket}
            onSearch={() => navigate("schedules")}
          />
          <div className="quick-grid">
            {[
              {
                page: "schedules",
                icon: CalendarDays,
                title: "Jadwal Bus",
                copy: (
                  <>
                    Lihat jadwal lengkap
                    <br />
                    semua rute UNSRI.
                  </>
                ),
                color: "mint",
              },
              {
                page: "orders",
                icon: Ticket,
                title: "Pesanan Saya",
                copy: (
                  <>
                    Cek dan kelola
                    <br />
                    pesanan tiket.
                  </>
                ),
                color: "blue",
              },
              {
                page: "chat",
                icon: Headphones,
                title: "Chat Bantuan",
                copy: (
                  <>
                    Ada pertanyaan?
                    <br />
                    Tim kami siap membantu.
                  </>
                ),
                color: "amber",
              },
            ].map((a) => (
              <button
                key={a.page}
                onClick={() => navigate(a.page)}
                className={`quick-card ${a.color}`}
              >
                <span className="quick-icon">
                  <a.icon />
                </span>
                <div>
                  <h2>{a.title}</h2>
                  <p>{a.copy}</p>
                </div>
                <ChevronRight className="quick-arrow" size={20} />
              </button>
            ))}
          </div>
          <ScheduleTable
            schedules={daySchedules}
            onBook={onBook}
            onAll={() => navigate("schedules")}
            now={now}
          />
          <p className="dashboard-footnote">
            Tarif hanya informasi. Pembayaran belum diproses melalui aplikasi.
          </p>
        </div>
        <aside className="dashboard-side">
          <WeekCalendar
            selected={selected}
            setSelected={setSelected}
            offset={offset}
            setOffset={setOffset}
            currentDay={currentDay}
          />
          <section className="panel timeline-panel">
            <div className="panel-heading">
              <h2>
                {selected === currentDay
                  ? "Jadwal Hari Ini"
                  : `Jadwal ${dateLabel(selected, true)}`}
              </h2>
              <button
                className="text-link"
                onClick={() => navigate("schedules")}
              >
                Lihat Semua
              </button>
            </div>
            <div className="timeline">
              {daySchedules.length ? (
                daySchedules.slice(0, 4).map((s, i) => (
                  <button
                    className={`timeline-item ${i === 0 ? "first" : ""}`}
                    key={s.id}
                    onClick={() => onBook(s)}
                  >
                    <i />
                    <strong>{timeLabel(s.departure_at)}</strong>
                    <div>
                      <b>
                        {s.routes.origin.replace("Kampus ", "")} →{" "}
                        {s.routes.destination.replace("Kampus ", "")}
                      </b>
                      <small>
                        {
                          s.routes.route_stops.find((r) => r.pickup_allowed)
                            ?.stops.name
                        }
                      </small>
                    </div>
                    <span className={`tag ${bookable(s, now) ? "blue" : "grey"}`}>
                      {bookable(s, now) ? "Tersedia" : "Ditutup"}
                    </span>
                  </button>
                ))
              ) : (
                <p className="muted timeline-empty">
                  Belum ada keberangkatan pada tanggal ini.
                </p>
              )}
            </div>
          </section>
          <section className="panel fleet-panel">
            <div className="panel-heading">
              <h2>
                <BusFront size={20} /> Status Bus
              </h2>
              <button className="text-link" onClick={onFleet}>
                Lihat Detail
              </button>
            </div>
            <div className="fleet-body">
              <div
                className="fleet-chart"
                style={{ "--percent": `${percent}%` } as React.CSSProperties}
              >
                <span>{percent}%</span>
              </div>
              <div className="fleet-copy">
                <strong>
                  Kapasitas
                  <br />
                  Operasional
                </strong>
                <small>
                  {operating} dari {buses.length} bus beroperasi
                </small>
              </div>
              <div className="fleet-legend">
                <span>
                  <i className="green-dot" />
                  Beroperasi <b>{operating}</b>
                </span>
                <span>
                  <i className="amber-dot" />
                  Perawatan <b>{maintenance}</b>
                </span>
                <span>
                  <i className="grey-dot" />
                  Nonaktif <b>{buses.length - operating - maintenance}</b>
                </span>
              </div>
            </div>
          </section>
          <div className="journey-banner">
            <p>
              Perjalanan aman,
              <br />
              nyaman, dan tepat waktu
              <br />
              <span>bersama UNSRI Bus.</span>
            </p>
            <BusIllustration />
          </div>
        </aside>
      </div>
    </>
  );
}
