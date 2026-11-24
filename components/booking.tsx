"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Armchair,
  Check,
  CheckCircle2,
  Download,
  MapPin,
  CircleGauge as SteeringWheel,
} from "lucide-react";
import type { Booking, Profile, Schedule, Seat } from "@/lib/types";
import { bookable, dateLabel, money, timeLabel } from "@/lib/utils";
import { demoSeats } from "@/lib/demo";
import { request } from "./auth";
import { Dialog } from "./ui/dialog";
import QRCode from "qrcode";
export function Reservation({
  schedule,
  demo,
  existing,
  onClose,
  onSuccess,
}: {
  schedule: Schedule;
  demo: boolean;
  existing: Booking[];
  onClose: () => void;
  onSuccess: (b: Booking) => void;
}) {
  const [seats, setSeats] = useState<Seat[]>([]),
    [selected, setSelected] = useState(""),
    [pickup, setPickup] = useState(""),
    [dropoff, setDropoff] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [step, setStep] = useState(1),
    [agreed, setAgreed] = useState(false);
  const stops = [...schedule.routes.route_stops].sort(
    (a, b) => a.stop_order - b.stop_order,
  );
  const selectedPickup = stops.find((s) => s.stop_id === pickup);
  const selectedDropoff = stops.find((s) => s.stop_id === dropoff);
  const seat = seats.find((s) => s.id === selected);
  const valid = Boolean(
    seat &&
    !seat.occupied &&
    selectedPickup &&
    selectedDropoff &&
    selectedDropoff.stop_order > selectedPickup.stop_order,
  );
  useEffect(() => {
    let live = true;
    const refresh = async () => {
      try {
        const result = demo
          ? demoSeats(schedule)
          : await request<Seat[]>(`seats/${schedule.id}`);
        if (live) {
          setSeats(result);
          setError("");
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      } finally {
        if (live) setLoading(false);
      }
    };
    void refresh();
    const interval = demo
      ? undefined
      : setInterval(() => void refresh(), 10000);
    return () => {
      live = false;
      clearInterval(interval);
    };
  }, [demo, schedule]);
  async function reserve() {
    if (!valid || !agreed || busy) return;
    setBusy(true);
    setError("");
    try {
      if (
        existing.some(
          (b) => b.schedules.id === schedule.id && b.status !== "cancelled",
        )
      )
        throw Error("Anda sudah memiliki tiket pada jadwal ini.");
      if (!bookable(schedule))
        throw Error("Pemesanan sudah ditutup atau jadwal penuh.");
      const ticket = demo
        ? {
            id: crypto.randomUUID(),
            booking_code: `DEMO-${Date.now().toString(36).toUpperCase()}`,
            student_id: "demo-student",
            status: "confirmed",
            created_at: new Date().toISOString(),
            schedules: schedule,
            schedule_seats: { seat_label: seat!.seat_label },
            pickup: selectedPickup!.stops,
            dropoff: selectedDropoff!.stops,
          }
        : await request<Booking>("bookings", {
            schedule_id: schedule.id,
            seat_id: selected,
            pickup_stop_id: pickup,
            dropoff_stop_id: dropoff,
          });
      onSuccess(ticket);
    } catch (e) {
      setError((e as Error).message);
      if (!demo) {
        try {
          setSeats(await request<Seat[]>(`seats/${schedule.id}`));
          setSelected("");
          setStep(1);
        } catch {
          /* Preserve original booking error. */
        }
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={step === 1 ? "Pilih kursi perjalanan" : "Konfirmasi pesanan"}
      description={`${schedule.routes.origin} → ${schedule.routes.destination}`}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <div className="reservation-steps">
        <span className="current">
          <b>{step > 1 ? <Check size={14} /> : 1}</b> Pilih kursi
        </span>
        <i />
        <span className={step === 2 ? "current" : ""}>
          <b>2</b> Konfirmasi
        </span>
      </div>
      {demo && (
        <div className="notice">
          Simulasi demo. Pesanan ini hanya tersimpan selama pratinjau dibuka.
        </div>
      )}
      <div className="reservation-layout">
        <div>
          {step === 1 ? (
            <>
              <div className="form-grid">
                <label>
                  Titik jemput
                  <select
                    value={pickup}
                    onChange={(e) => {
                      setPickup(e.target.value);
                      setDropoff("");
                    }}
                  >
                    <option value="">Pilih halte jemput</option>
                    {stops
                      .filter((s) => s.pickup_allowed)
                      .map((s) => (
                        <option key={s.stop_id} value={s.stop_id}>
                          {s.stops.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Titik turun
                  <select
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                    disabled={!pickup}
                  >
                    <option value="">Pilih halte turun</option>
                    {stops
                      .filter(
                        (s) =>
                          s.dropoff_allowed &&
                          s.stop_order >
                            (selectedPickup?.stop_order || Infinity),
                      )
                      .map((s) => (
                        <option key={s.stop_id} value={s.stop_id}>
                          {s.stops.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="seat-legend">
                <span>
                  <i /> Tersedia
                </span>
                <span>
                  <i className="chosen" /> Dipilih
                </span>
                <span>
                  <i className="taken" /> Terisi
                </span>
              </div>
              {loading ? (
                <div className="loading-state">Memuat denah kursi…</div>
              ) : (
                <div className="bus-seats">
                  <div className="driver">
                    <span>DEPAN BUS</span>
                    <SteeringWheel />
                  </div>
                  <div className="seats-grid">
                    {seats
                      .sort(
                        (a, b) => a.row_no - b.row_no || a.col_no - b.col_no,
                      )
                      .map((s) => (
                        <button
                          key={s.id}
                          style={{
                            gridColumn: s.col_no > 2 ? s.col_no + 1 : s.col_no,
                            gridRow: s.row_no,
                          }}
                          disabled={s.occupied || !bookable(schedule)}
                          aria-label={`Kursi ${s.seat_label}${s.occupied ? ", terisi" : ""}`}
                          aria-pressed={s.id === selected}
                          className={`seat ${s.occupied ? "taken" : s.id === selected ? "chosen" : ""}`}
                          onClick={() => setSelected(s.id)}
                        >
                          <Armchair size={19} />
                          {s.seat_label}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="confirmation">
              <CheckCircle2 size={36} />
              <h3>Periksa perjalananmu</h3>
              <p>
                Pastikan jadwal, halte, dan kursi sudah sesuai sebelum memesan.
              </p>
              <div className="confirmation-route">
                <MapPin />
                <span>
                  {selectedPickup?.stops.name}
                  <ArrowRight size={16} />
                  {selectedDropoff?.stops.name}
                </span>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>
                  Saya menyetujui reservasi satu kursi dan batas pembatalan 30
                  menit sebelum keberangkatan. Tarif bersifat informasi;
                  aplikasi tidak memproses pembayaran.
                </span>
              </label>
            </div>
          )}
        </div>
        <aside className="reservation-summary">
          <h3>Ringkasan perjalanan</h3>
          {[
            ["Tanggal", dateLabel(schedule.departure_at, true)],
            ["Berangkat", `${timeLabel(schedule.departure_at)} WIB`],
            ["Tiba", `${timeLabel(schedule.arrival_at)} WIB`],
            ["Armada", schedule.buses.name],
            ["Kursi", seat?.seat_label || "Belum dipilih"],
            ["Info tarif", money(schedule.fare_idr)],
          ].map(([k, v]) => (
            <div key={k}>
              <span>{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
          <p>Pemesanan dan pembatalan ditutup 30 menit sebelum berangkat.</p>
        </aside>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="dialog-actions">
        {step === 2 && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setStep(1)}
          >
            Kembali
          </button>
        )}
        <button
          className="button primary"
          disabled={
            busy ||
            loading ||
            !valid ||
            !bookable(schedule) ||
            (step === 2 && !agreed)
          }
          onClick={() => (step === 1 ? setStep(2) : void reserve())}
        >
          {busy ? "Memesan…" : step === 1 ? "Lanjutkan" : "Konfirmasi Pesanan"}
          <ArrowRight size={17} />
        </button>
      </div>
    </Dialog>
  );
}
export function TicketView({
  booking,
  profile,
  demo,
  onClose,
  onCancel,
}: {
  booking: Booking;
  profile: Profile;
  demo: boolean;
  onClose: () => void;
  onCancel: (b: Booking) => void;
}) {
  const s = booking.schedules;
  const canCancel =
    booking.status === "confirmed" &&
    (profile.role === "admin" ||
      new Date(s.departure_at).getTime() > Date.now() + 1800000);
  return (
    <Dialog
      className="ticket-dialog"
      title="Tiket perjalanan"
      description="Tunjukkan kode QR saat naik bus."
      onClose={onClose}
    >
      <div className="digital-ticket">
        <div className="digital-ticket-top">
          <span>
            {demo ? "TIKET SIMULASI · TIDAK BERLAKU" : "E-TICKET UNSRI BUS"}
          </span>
          <h2>
            {s.routes.origin}
            <ArrowRight size={18} />
            {s.routes.destination}
          </h2>
          <p>{dateLabel(s.departure_at, true)} · {timeLabel(s.departure_at)} WIB</p>
        </div>
        <div className="ticket-fields">
          {[
            ["Penumpang", booking.profiles?.full_name || profile.full_name],
            ["Kursi", booking.schedule_seats.seat_label],
            ["Titik jemput", booking.pickup.name],
            ["Titik turun", booking.dropoff.name],
            ["Bus", `${s.buses.name} · ${s.buses.plate_number}`],
          ].map(([k, v]) => (
            <div key={k}>
              <span>{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
        <div className="ticket-code-row">
          <TicketQr value={booking.booking_code} />
          <div className="ticket-code">
            <small>KODE BOOKING</small>
            <strong>{booking.booking_code}</strong>
            <span className={`ticket-status ${booking.status}`}>
              {booking.status === "cancelled" ? "Dibatalkan" : "Terkonfirmasi"}
            </span>
          </div>
        </div>
      </div>
      <p className="ticket-info">
        Tarif informasi: {money(s.fare_idr)}. Aplikasi belum memproses
        pembayaran.
      </p>
      <div className="dialog-actions">
        {canCancel && (
          <button className="button danger" onClick={() => onCancel(booking)}>
            Batalkan tiket
          </button>
        )}
        <button className="button primary" onClick={() => window.print()}>
          <Download size={17} /> Cetak / Simpan PDF
        </button>
      </div>
    </Dialog>
  );
}

function TicketQr({ value }: { value: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, {
      width: 180,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#123b2b", light: "#ffffff" },
    }).then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [value]);

  return src ? (
    <img className="ticket-qr" src={src} alt={`QR tiket ${value}`} />
  ) : (
    <div className="ticket-qr ticket-qr-loading" aria-label="Menyiapkan QR tiket" />
  );
}
