"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { Bus, Route, Schedule, Stop } from "@/lib/types";
import { dateKey, dateLabel, timeLabel, today } from "@/lib/utils";
import { Dialog } from "./ui/dialog";
import { request } from "./auth";
type Entity = Bus | Route | Schedule | Stop;
export function Management({
  buses,
  routes,
  stops,
  schedules,
  onRefresh,
  demo,
  initialTab = "schedule",
}: {
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
  schedules: Schedule[];
  onRefresh: () => Promise<void>;
  demo: boolean;
  initialTab?: string;
}) {
  const [tab, setTab] = useState(initialTab),
    [editing, setEditing] = useState<{ kind: string; item?: Entity } | null>(
      null,
    ),
    [cancel, setCancel] = useState<Schedule | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [stopIds, setStopIds] = useState<string[]>([]);
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [scheduleStatus, setScheduleStatus] = useState("all");
  const [schedulePeriod, setSchedulePeriod] = useState("all");
  const [scheduleOrder, setScheduleOrder] = useState("created");
  const titles: Record<string, string> = {
    schedule: "Jadwal",
    bus: "Armada",
    route: "Rute",
    stop: "Halte",
  };
  function edit(kind: string, item?: Entity) {
    setError("");
    setEditing({ kind, item });
    setStopIds(
      kind === "route" && item
        ? [...(item as Route).route_stops]
            .sort((a, b) => a.stop_order - b.stop_order)
            .map((s) => s.stop_id)
        : ["", ""],
    );
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      if (demo)
        throw Error(
          "Pengelolaan admin memerlukan proyek Supabase yang terhubung.",
        );
      const data: Record<string, unknown> = Object.fromEntries(
        new FormData(event.currentTarget),
      );
      if (editing.kind === "schedule") {
        data.departure_at = new Date(
          String(data.departure_at) + ":00+07:00",
        ).toISOString();
        data.arrival_at = new Date(
          String(data.arrival_at) + ":00+07:00",
        ).toISOString();
      }
      if (editing.kind === "route") {
        data.stops = stopIds.map((stop_id, i) => ({
          stop_id,
          pickup_allowed: i < stopIds.length - 1,
          dropoff_allowed: i > 0,
        }));
        data.is_active = data.is_active === "true";
      }
      if (editing.kind === "stop") data.is_active = data.is_active === "true";
      await request("admin/manage", {
        kind: editing.kind,
        id: editing.item?.id,
        data,
      });
      setEditing(null);
      await onRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancelSchedule() {
    if (!cancel) return;
    setBusy(true);
    setError("");
    try {
      await request("admin/manage", {
        kind: "cancel_schedule",
        id: cancel.id,
        data: { reason },
      });
      setCancel(null);
      await onRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const editItem = editing?.item as unknown as
    | Record<string, string | number | boolean>
    | undefined;
  const input = (
    name: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={String(editItem?.[name] || "")}
        maxLength={100}
        {...(type === "number"
          ? {
              min: name === "capacity" ? 4 : 0,
              max: name === "capacity" ? 60 : 1000000,
            }
          : {})}
      />
    </label>
  );
  const localTime = (value: unknown) =>
    value
      ? new Date(new Date(String(value)).getTime() + 7 * 3600000)
          .toISOString()
          .slice(0, 16)
      : "";
  const scheduleStatuses = [...new Set(schedules.map((schedule) => schedule.status))].sort();
  const normalizedSearch = scheduleSearch.trim().toLocaleLowerCase("id-ID");
  const visibleSchedules = schedules
    .filter((schedule) => {
      if (scheduleStatus !== "all" && schedule.status !== scheduleStatus) return false;
      const departure = new Date(schedule.departure_at).getTime();
      if (schedulePeriod === "upcoming" && departure < Date.now()) return false;
      if (schedulePeriod === "past" && departure >= Date.now()) return false;
      if (schedulePeriod === "today" && dateKey(schedule.departure_at) !== today()) return false;
      if (!normalizedSearch) return true;
      const searchable = [
        schedule.routes.origin,
        schedule.routes.destination,
        schedule.routes.name,
        schedule.buses.name,
        schedule.buses.plate_number,
        dateLabel(schedule.departure_at, true),
        timeLabel(schedule.departure_at),
        schedule.status,
      ].join(" ").toLocaleLowerCase("id-ID");
      return searchable.includes(normalizedSearch);
    })
    .sort((a, b) => {
      if (scheduleOrder === "created") {
        const createdDifference = new Date(a.created_at || a.departure_at).getTime() - new Date(b.created_at || b.departure_at).getTime();
        if (createdDifference) return -createdDifference;
      }
      const difference = new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime();
      return scheduleOrder === "departure-oldest" ? difference : -difference;
    });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Kelola operasional</h1>
          <p>Jadwal, armada, rute, dan halte bus kampus.</p>
        </div>
        <button className="button primary" onClick={() => edit(tab)}>
          <Plus size={17} /> Tambah {titles[tab]}
        </button>
      </div>
      <div className="segments">
        {Object.entries(titles).map(([key, label]) => (
          <button
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="panel">
        {tab === "schedule" && (
          <div className="management-filters">
            <label className="management-filter-search">
              <Search size={17} />
              <input
                type="search"
                aria-label="Cari jadwal, rute, atau armada"
                placeholder="Cari rute, bus, tanggal…"
                value={scheduleSearch}
                onChange={(event) => setScheduleSearch(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter status jadwal"
              value={scheduleStatus}
              onChange={(event) => setScheduleStatus(event.target.value)}
            >
              <option value="all">Semua status</option>
              {scheduleStatuses.map((status) => (
                <option value={status} key={status}>
                  {status === "scheduled" ? "Terjadwal" : status === "cancelled" ? "Dibatalkan" : status}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter waktu keberangkatan"
              value={schedulePeriod}
              onChange={(event) => setSchedulePeriod(event.target.value)}
            >
              <option value="all">Semua tanggal</option>
              <option value="today">Hari ini</option>
              <option value="upcoming">Akan datang</option>
              <option value="past">Sudah lewat</option>
            </select>
            <select
              aria-label="Urutkan jadwal"
              value={scheduleOrder}
              onChange={(event) => setScheduleOrder(event.target.value)}
            >
              <option value="created">Data ditambahkan terbaru</option>
              <option value="departure-oldest">Keberangkatan terdekat</option>
              <option value="departure-newest">Tanggal keberangkatan terbaru</option>
            </select>
            <p className="management-filter-count">
              {visibleSchedules.length} dari {schedules.length} jadwal
            </p>
          </div>
        )}
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                <th>{tab === "schedule" ? "Jadwal / Rute" : "Nama"}</th>
                <th>
                  {tab === "schedule"
                    ? "Armada"
                    : tab === "bus"
                      ? "Kapasitas"
                      : tab === "route"
                        ? "Halte"
                        : "Deskripsi"}
                </th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tab === "schedule" &&
                visibleSchedules.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>
                        {s.routes.origin} → {s.routes.destination}
                      </strong>
                      <small>
                        {dateLabel(s.departure_at, true)} ·{" "}
                        {timeLabel(s.departure_at)} WIB
                      </small>
                    </td>
                    <td>
                      {s.buses.name}
                      <small>
                        {s.capacity - s.available} / {s.capacity} kursi
                      </small>
                    </td>
                    <td>
                      <span className="tag green">{s.status}</span>
                    </td>
                    <td>
                      <div className="button-row">
                        <button
                          className="icon-button"
                          aria-label={`Edit jadwal ${s.routes.name}`}
                          onClick={() => edit("schedule", s)}
                          disabled={s.status !== "scheduled"}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={`Batalkan jadwal ${s.routes.name}`}
                          disabled={s.status !== "scheduled"}
                          onClick={() => {
                            setCancel(s);
                            setReason("");
                            setError("");
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {tab === "bus" &&
                buses.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.name}</strong>
                      <small>
                        {b.code} · {b.plate_number}
                      </small>
                    </td>
                    <td>{b.capacity} kursi</td>
                    <td>
                      <span className="tag green">{b.status}</span>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${b.name}`}
                        onClick={() => edit("bus", b)}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              {tab === "route" &&
                routes.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                      <small>
                        {r.origin} → {r.destination}
                      </small>
                    </td>
                    <td>{r.route_stops.length} halte</td>
                    <td>{r.is_active ? "Aktif" : "Nonaktif"}</td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${r.name}`}
                        onClick={() => edit("route", r)}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              {tab === "stop" &&
                stops.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                    </td>
                    <td>{s.description}</td>
                    <td>
                      {(s as Stop & { is_active?: boolean }).is_active === false
                        ? "Nonaktif"
                        : "Aktif"}
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${s.name}`}
                        onClick={() => edit("stop", s)}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!(
          tab === "schedule"
            ? visibleSchedules
            : tab === "bus"
              ? buses
              : tab === "route"
                ? routes
                : stops
        ).length && (
          <div className="inline-empty">
            <h3>{tab === "schedule" && schedules.length ? "Tidak ada jadwal yang cocok" : `Belum ada ${titles[tab].toLowerCase()}`}</h3>
            <p>{tab === "schedule" && schedules.length ? "Coba ubah kata kunci atau filter yang dipilih." : "Tambahkan data pertama untuk mulai mengelola perjalanan."}</p>
          </div>
        )}
      </section>
      <p className="muted section-note">
        Nonaktifkan data yang tidak dipakai untuk mempertahankan riwayat. Jadwal
        yang memiliki pesanan harus dibatalkan dengan alasan sebelum diganti.
      </p>
      {editing && (
        <Dialog
          title={`${editing.item ? "Edit" : "Tambah"} ${titles[editing.kind]}`}
          description="Perubahan operasional dicatat dalam audit log."
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form onSubmit={save}>
            {editing.kind === "bus" && (
              <>
                {input("code", "Kode bus")}
                {input("name", "Nama bus")}
                {input("plate_number", "Nomor polisi")}
                {input("capacity", "Kapasitas kursi", "number")}
                <label>
                  Status
                  <select
                    name="status"
                    defaultValue={String(editItem?.status || "operating")}
                  >
                    <option value="operating">Beroperasi</option>
                    <option value="maintenance">Perawatan</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </label>
              </>
            )}
            {editing.kind === "stop" && (
              <>
                {input("name", "Nama halte")}
                {input("description", "Keterangan lokasi", "text", false)}
              </>
            )}
            {editing.kind === "route" && (
              <>
                {input("name", "Nama rute")}
                <div className="form-grid">
                  {input("origin", "Asal")}
                  {input("destination", "Tujuan")}
                </div>
                <label>Urutan halte</label>
                {stopIds.map((id, i) => (
                  <div key={i} className="route-stop-row">
                    <span>{i + 1}</span>
                    <select
                      aria-label={`Halte urutan ${i + 1}`}
                      required
                      value={id}
                      onChange={(e) =>
                        setStopIds(
                          stopIds.map((v, n) => (n === i ? e.target.value : v)),
                        )
                      }
                    >
                      <option value="">Pilih halte</option>
                      {stops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={i === 0}
                      aria-label="Naikkan halte"
                      onClick={() =>
                        setStopIds((old) => {
                          const next = [...old];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          return next;
                        })
                      }
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={i === stopIds.length - 1}
                      aria-label="Turunkan halte"
                      onClick={() =>
                        setStopIds((old) => {
                          const next = [...old];
                          [next[i + 1], next[i]] = [next[i], next[i + 1]];
                          return next;
                        })
                      }
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={stopIds.length <= 2}
                      aria-label="Hapus halte dari rute"
                      onClick={() =>
                        setStopIds(stopIds.filter((_, n) => n !== i))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setStopIds([...stopIds, ""])}
                >
                  <Plus size={16} /> Tambah halte
                </button>
              </>
            )}
            {["route", "stop"].includes(editing.kind) && (
              <label>
                Status
                <select
                  name="is_active"
                  defaultValue={String(editItem?.is_active ?? true)}
                >
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </label>
            )}
            {editing.kind === "schedule" && (
              <>
                <label>
                  Rute
                  <select
                    name="route_id"
                    defaultValue={String(editItem?.route_id || "")}
                    required
                  >
                    <option value="">Pilih rute</option>
                    {routes
                      .filter((r) => r.is_active)
                      .map((r) => (
                        <option value={r.id} key={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Armada
                  <select
                    name="bus_id"
                    defaultValue={String(editItem?.bus_id || "")}
                    required
                  >
                    <option value="">Pilih bus</option>
                    {buses
                      .filter((b) => b.status === "operating")
                      .map((b) => (
                        <option value={b.id} key={b.id}>
                          {b.name} · {b.capacity} kursi
                        </option>
                      ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Berangkat (WIB)
                    <input
                      name="departure_at"
                      type="datetime-local"
                      required
                      defaultValue={localTime(editItem?.departure_at)}
                    />
                  </label>
                  <label>
                    Tiba (WIB)
                    <input
                      name="arrival_at"
                      type="datetime-local"
                      required
                      defaultValue={localTime(editItem?.arrival_at)}
                    />
                  </label>
                </div>
                {input("fare_idr", "Tarif informasi (Rp)", "number")}
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button className="button primary" disabled={busy}>
                {busy ? "Menyimpan…" : "Simpan perubahan"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {cancel && (
        <Dialog
          title="Batalkan jadwal?"
          onClose={() => {
            if (!busy) setCancel(null);
          }}
          description="Tiket aktif akan dibatalkan dan penumpang menerima notifikasi."
        >
          <label>
            Alasan pembatalan
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={5}
              maxLength={300}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setCancel(null)}
            >
              Kembali
            </button>
            <button
              className="button danger"
              disabled={busy || reason.trim().length < 5}
              onClick={() => void cancelSchedule()}
            >
              {busy ? "Membatalkan…" : "Batalkan jadwal"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
