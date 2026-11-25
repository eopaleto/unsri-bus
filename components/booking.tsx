"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Armchair,
  BusFront,
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
  const qrSrc = useTicketQr(booking.booking_code);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const canCancel =
    booking.status === "confirmed" &&
    (profile.role === "admin" ||
      new Date(s.departure_at).getTime() > Date.now() + 1800000);
  return (
    <Dialog
      className="ticket-dialog"
      title="Tiket perjalanan"
      description="E-ticket perjalanan UNSRI Bus."
      onClose={onClose}
    >
      <div className="digital-ticket">
        <aside className="ticket-stub">
          <div className="ticket-stub-brand">
            <BusFront size={22} />
            <span>UNSRI</span>
            <strong>BUS<br />TICKET</strong>
            <small>EXPRESS</small>
          </div>
          <div className="ticket-stub-route">
            <span>DARI</span><strong>{s.routes.origin}</strong>
            <ArrowRight size={15} />
            <span>KE</span><strong>{s.routes.destination}</strong>
          </div>
          <div className="ticket-stub-code">
            <small>BOOKING NO.</small>
            <strong>{booking.booking_code}</strong>
          </div>
        </aside>
        <section className="ticket-main">
          <header className="ticket-main-heading">
            <div>
              <span>{demo ? "TIKET SIMULASI · TIDAK BERLAKU" : "E-TICKET · UNSRI BUS"}</span>
              <h2>BUS TICKET</h2>
              <p>{s.routes.origin} <ArrowRight size={14} /> {s.routes.destination}</p>
            </div>
            <span className={`ticket-status ${booking.status}`}>
              {booking.status === "cancelled" ? "Dibatalkan" : "Terkonfirmasi"}
            </span>
          </header>
          <div className="ticket-content">
            <div className="ticket-fields">
              {[
                ["Tanggal", dateLabel(s.departure_at, true)],
                ["Berangkat", `${timeLabel(s.departure_at)} WIB`],
                ["Nomor kursi", booking.schedule_seats.seat_label],
                ["Penumpang", booking.profiles?.full_name || profile.full_name],
                ["Titik jemput", booking.pickup.name],
                ["Titik turun", booking.dropoff.name],
                ["Bus", `${s.buses.name} · ${s.buses.plate_number}`],
                ["Tarif", money(s.fare_idr)],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="ticket-qr-block">
              {qrSrc ? (
                <img className="ticket-qr" src={qrSrc} alt={`QR tiket ${booking.booking_code}`} />
              ) : (
                <div className="ticket-qr ticket-qr-loading" aria-label="Menyiapkan QR tiket" />
              )}
              <small>SCAN SAAT NAIK</small>
            </div>
          </div>
        </section>
      </div>
      <div className="dialog-actions">
        {canCancel && (
          <button className="button danger" onClick={() => onCancel(booking)}>
            Batalkan tiket
          </button>
        )}
        <button
          className="button primary"
          disabled={!qrSrc || downloading}
          onClick={() => {
            if (!qrSrc) return;
            setDownloading(true);
            setDownloadError("");
            void (async () => {
              try {
                const { jsPDF } = await import("jspdf");
                const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5" });
                const pageW = 210;
                const pageH = 148;
                const navy: [number, number, number] = [25, 43, 56];
                const muted: [number, number, number] = [103, 119, 130];
                const ink: [number, number, number] = [31, 47, 59];
                pdf.setFillColor(246, 249, 250);
                pdf.rect(0, 0, pageW, pageH, "F");
                pdf.setFillColor(255, 255, 255);
                pdf.setDrawColor(219, 226, 230);
                pdf.roundedRect(7, 7, 196, 134, 2, 2, "FD");
                pdf.setFillColor(...navy);
                pdf.roundedRect(7, 7, 43, 134, 2, 2, "F");
                pdf.rect(47, 7, 3, 134, "F");
                pdf.setTextColor(255, 255, 255);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(10);
                pdf.text("UNSRI BUS", 13, 19);
                pdf.setFontSize(22);
                pdf.text("BUS", 13, 34);
                pdf.text("TICKET", 13, 43);
                pdf.setFontSize(8);
                pdf.text("EXPRESS", 13, 50);
                pdf.setDrawColor(115, 137, 149);
                pdf.setLineDashPattern([1.2, 1.2], 0);
                pdf.line(50, 10, 50, 138);
                pdf.setLineDashPattern([], 0);
                pdf.setFontSize(7);
                pdf.setTextColor(193, 207, 215);
                pdf.text("DARI", 13, 69);
                pdf.setFontSize(9);
                pdf.setTextColor(255, 255, 255);
                pdf.text(pdf.splitTextToSize(s.routes.origin, 30), 13, 75);
                pdf.setFontSize(7);
                pdf.setTextColor(193, 207, 215);
                pdf.text("KE", 13, 91);
                pdf.setFontSize(9);
                pdf.setTextColor(255, 255, 255);
                pdf.text(pdf.splitTextToSize(s.routes.destination, 30), 13, 97);
                pdf.setFontSize(7);
                pdf.setTextColor(193, 207, 215);
                pdf.text("BOOKING NO.", 13, 121);
                pdf.setFontSize(8);
                pdf.setTextColor(255, 255, 255);
                pdf.text(pdf.splitTextToSize(booking.booking_code, 30), 13, 127);

                pdf.setTextColor(...muted);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(8);
                pdf.text(demo ? "SIMULASI · TIDAK BERLAKU" : "E-TICKET · UNSRI BUS", 59, 19);
                pdf.setTextColor(...ink);
                pdf.setFontSize(26);
                pdf.setFont("helvetica", "bolditalic");
                pdf.text("BUS TICKET", 58, 33);
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(10);
                pdf.text(`${s.routes.origin}  >  ${s.routes.destination}`, 59, 41);
                pdf.setDrawColor(222, 229, 232);
                const drawField = (label: string, value: string, x: number, y: number, w: number) => {
                  pdf.setFont("helvetica", "normal");
                  pdf.setFontSize(7);
                  pdf.setTextColor(...muted);
                  pdf.text(label.toUpperCase(), x, y);
                  pdf.setFont("helvetica", "bold");
                  pdf.setFontSize(9);
                  pdf.setTextColor(...ink);
                  pdf.text(pdf.splitTextToSize(value, w), x, y + 6);
                  pdf.setDrawColor(222, 229, 232);
                  pdf.line(x, y + 10, x + w, y + 10);
                };
                drawField("Tanggal", dateLabel(s.departure_at, true), 59, 54, 36);
                drawField("Berangkat", `${timeLabel(s.departure_at)} WIB`, 101, 54, 38);
                drawField("No. kursi", booking.schedule_seats.seat_label, 59, 73, 36);
                drawField("Penumpang", booking.profiles?.full_name || profile.full_name, 101, 73, 38);
                drawField("Titik jemput", booking.pickup.name, 59, 92, 36);
                drawField("Titik turun", booking.dropoff.name, 101, 92, 38);
                drawField("Bus", `${s.buses.name} · ${s.buses.plate_number}`, 59, 111, 38);
                drawField("Tarif", money(s.fare_idr), 101, 111, 38);
                pdf.addImage(qrSrc, "PNG", 155, 65, 36, 36);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(7);
                pdf.setTextColor(...muted);
                pdf.text("SCAN SAAT NAIK", 173, 105, { align: "center" });
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(8);
                pdf.setTextColor(...muted);
                pdf.text(booking.status === "cancelled" ? "STATUS: DIBATALKAN" : "STATUS: TERKONFIRMASI", 59, 132);
                pdf.save(`tiket-${booking.booking_code.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`);
              } catch {
                setDownloadError("PDF belum berhasil dibuat. Silakan coba lagi.");
              } finally {
                setDownloading(false);
              }
            })();
          }}
        >
          <Download size={17} /> {downloading ? "Menyiapkan PDF…" : "Unduh PDF"}
        </button>
      </div>
      {downloadError && <p className="ticket-download-error" role="alert">{downloadError}</p>}
    </Dialog>
  );
}

function useTicketQr(value: string) {
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

  return src;
}
