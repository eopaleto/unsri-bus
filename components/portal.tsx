"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  BusFront,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Headphones,
  House,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Ticket,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type {
  Booking,
  Bus,
  Conversation,
  Message,
  Notice,
  Profile,
  Route,
  Schedule,
  Stop,
} from "@/lib/types";
import {
  addDays,
  bookable,
  dateKey,
  dateLabel,
  initials,
  money,
  timeLabel,
  today,
} from "@/lib/utils";
import {
  demoBooking,
  demoBuses,
  demoProfile,
  demoRoutes,
  demoSchedules,
  demoStops,
} from "@/lib/demo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Auth, Brand, Landing, request } from "./auth";
import { Dashboard } from "./dashboard";
import { Reservation, TicketView } from "./booking";
import { BusIllustration } from "./illustration";
import { Dialog } from "./ui/dialog";
import { Management } from "./management";
import { FeatureSearch, ProfileDropdown } from "./header-controls";
import type { Feature } from "@/lib/navigation";
import { AcademicFields } from "./academic-fields";

type Bundle = {
  schedules: Schedule[];
  bookings: Booking[];
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
  notices: Notice[];
};
const emptyBundle: Bundle = {
  schedules: [],
  bookings: [],
  buses: [],
  routes: [],
  stops: [],
  notices: [],
};
const studentNav = [
  { id: "dashboard", icon: House, label: "Dashboard", mobileLabel: "Beranda" },
  { id: "orders", icon: Ticket, label: "Pesanan", mobileLabel: "Pesanan" },
  { id: "schedules", icon: CalendarDays, label: "Jadwal", mobileLabel: "Jadwal" },
  { id: "chat", icon: MessageCircle, label: "Chat", mobileLabel: "Chat" },
  { id: "profile", icon: UserRound, label: "Profil", mobileLabel: "Profil" },
];
const adminNav = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", mobileLabel: "Beranda" },
  { id: "manage", icon: Settings2, label: "Kelola", mobileLabel: "Kelola" },
  { id: "orders", icon: Ticket, label: "Pesanan", mobileLabel: "Pesanan" },
  { id: "students", icon: Users, label: "Mahasiswa", mobileLabel: "Mhs." },
  { id: "chat", icon: MessageCircle, label: "Chat", mobileLabel: "Chat" },
  { id: "profile", icon: UserRound, label: "Profil", mobileLabel: "Profil" },
];

export function Portal({
  initialProfile,
  initialScreen,
  configured,
}: {
  initialProfile: Profile | null;
  initialScreen: string;
  configured: boolean;
}) {
  const demo = initialScreen === "demo";
  const [profile, setProfile] = useState<Profile | null>(
    demo ? demoProfile : initialProfile,
  );
  const [page, setPage] = useState("dashboard"),
    [bundle, setBundle] = useState<Bundle>(() => {
      if (!demo) return emptyBundle;
      const schedules = demoSchedules();
      return {
        schedules,
        bookings: demoBooking(schedules),
        buses: demoBuses,
        routes: demoRoutes,
        stops: demoStops,
        notices: [],
      };
    });
  const [loading, setLoading] = useState(!demo && Boolean(initialProfile)),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [date, setDate] = useState(today()),
    [offset, setOffset] = useState(0),
    [search, setSearch] = useState(""),
    [route, setRoute] = useState(""),
    [time, setTime] = useState(""),
    [filterDate, setFilterDate] = useState("");
  const [orderFilter, setOrderFilter] = useState("upcoming"),
    [orderSearch, setOrderSearch] = useState("");
  const [reservation, setReservation] = useState<Schedule | null>(null),
    [ticket, setTicket] = useState<Booking | null>(null),
    [cancel, setCancel] = useState<Booking | null>(null),
    [busy, setBusy] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false),
    [fleetOpen, setFleetOpen] = useState(false),
    [sidebarExpanded, setSidebarExpanded] = useState(false),
    [drawerOpen, setDrawerOpen] = useState(false),
    [compactViewport, setCompactViewport] = useState(false),
    [chatUnread, setChatUnread] = useState(0);
  const pageRef = useRef(page);
  const [managementTab, setManagementTab] = useState("schedule");
  useEffect(() => {
    try { setSidebarExpanded(localStorage.getItem("unsri-sidebar") === "expanded"); } catch {}
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1199px)");
    const updateViewport = () => {
      setCompactViewport(query.matches);
      if (!query.matches) setDrawerOpen(false);
    };
    updateViewport();
    query.addEventListener("change", updateViewport);
    return () => query.removeEventListener("change", updateViewport);
  }, []);
  useEffect(() => {
    if (!drawerOpen || !compactViewport) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [compactViewport, drawerOpen]);
  useEffect(() => {
    pageRef.current = page;
    if (page === "chat") setChatUnread(0);
  }, [page]);
  const admin = profile?.role === "admin";
  const navigate = (value: string) => {
    setPage(value);
    if (value === "chat") setChatUnread(0);
    setDrawerOpen(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const refresh = useCallback(async () => {
    if (demo || !initialProfile) return;
    const results = await Promise.allSettled([
        request<Schedule[]>("schedules"),
        request<Booking[]>("bookings"),
        request<Bus[]>("fleet"),
        request<Route[]>("routes"),
        request<Stop[]>("stops"),
        request<Notice[]>("notifications"),
      ]);
    const keys = ["schedules", "bookings", "buses", "routes", "stops", "notices"] as const;
    const labels = ["Jadwal", "Pesanan", "Armada", "Rute", "Halte", "Notifikasi"];
    setBundle((previous) => {
      const next = { ...previous };
      results.forEach((result, index) => {
        if (result.status === "fulfilled") Object.assign(next, { [keys[index]]: result.value });
      });
      return next;
    });
    const failures = results.flatMap((result, index) => result.status === "rejected"
      ? [`${labels[index]}: ${result.reason instanceof Error ? result.reason.message : "Gagal dimuat"}`] : []);
    setError(failures.join(" · "));
    if (failures.length) throw Error(failures.join(" · "));
  }, [demo, initialProfile]);
  useEffect(() => {
    if (!profile || demo) return;
    let live = true;
    refresh()
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [refresh, demo, profile]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const client = demo ? null : supabaseBrowser();
    if (!client || !profile) return;
    const channel = client
      .channel(`notices-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${profile.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const notice = payload.new as unknown as Notice & { type?: string };
          if (notice.type === "chat_closed") {
            setToast(notice.title || "Percakapan bantuan telah selesai.");
          }
          void refresh().catch(() => {});
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [demo, profile, refresh]);
  useEffect(() => {
    const client = demo ? null : supabaseBrowser();
    if (!client || !profile) return;
    const channel = client
      .channel(`incoming-chat-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new: Record<string, unknown> }) => {
          const incoming = payload.new as unknown as Message;
          if (incoming.sender_id === profile.id) return;
          setChatUnread((count) => Math.min(count + 1, 99));
          if (pageRef.current !== "chat") {
            setToast("Pesan chat baru masuk.");
          }
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [demo, profile]);
  useEffect(() => {
    if (demo || !profile) return;
    request<number>("chat/unread").then(setChatUnread).catch(() => {});
  }, [demo, profile]);
  if (!profile) {
    if (
      ["login", "register", "forgot-password", "reset-password"].includes(
        initialScreen,
      )
    )
      return <Auth mode={initialScreen} configured={configured} />;
    return <Landing />;
  }
  if (initialScreen === "reset-password")
    return <Auth mode="reset-password" configured={configured} />;
  const greeting = new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    hour12: false,
  });
  const greetingText =
    Number(greeting) < 11
      ? "Selamat pagi,"
      : Number(greeting) < 15
        ? "Selamat siang,"
        : Number(greeting) < 18
          ? "Selamat sore,"
          : "Selamat malam,";
  const nav = admin ? adminNav : studentNav;
  async function logout() {
    setBusy(true);
    try {
      if (!demo) await request("auth/logout", {});
      window.location.assign("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openFeature(feature: Feature) {
    if (feature.id === "logout") { void logout(); return; }
    if (feature.id === "notifications") { setNotificationOpen(true); return; }
    if (feature.id === "fleet") { setFleetOpen(true); return; }
    if (feature.tab) setManagementTab(feature.tab);
    if (feature.page) navigate(feature.page);
  }
  async function booked(value: Booking) {
    setReservation(null);
    setTicket(value);
    setToast(
      demo ? "Simulasi pesanan berhasil dibuat." : "Kursi berhasil dipesan.",
    );
    if (demo)
      setBundle((old) => ({
        ...old,
        bookings: [value, ...old.bookings],
        schedules: old.schedules.map((s) =>
          s.id === value.schedules.id
            ? { ...s, available: s.available - 1 }
            : s,
        ),
      }));
    else await refresh().catch((e) => setError(e.message));
  }
  async function cancelBooking() {
    if (!cancel) return;
    setBusy(true);
    try {
      if (demo)
        setBundle((old) => ({
          ...old,
          bookings: old.bookings.map((b) =>
            b.id === cancel.id ? { ...b, status: "cancelled" } : b,
          ),
          schedules: old.schedules.map((s) =>
            s.id === cancel.schedules.id
              ? { ...s, available: Math.min(s.capacity, s.available + 1) }
              : s,
          ),
        }));
      else {
        await request(`bookings/${cancel.id}/cancel`, {});
        await refresh();
      }
      setCancel(null);
      setTicket(null);
      setToast("Pesanan dibatalkan. Kursi tersedia kembali.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const unreadNoticeCount = bundle.notices.filter((notice) => !notice.read_at).length;
  const totalNotificationCount = unreadNoticeCount + chatUnread;
  const notificationButton = (
    <button
      className="notification-button"
      aria-label="Lihat notifikasi"
      onClick={() => setNotificationOpen(true)}
    >
      <Bell size={22} />
      {totalNotificationCount > 0 && (
        <b className="notification-count" aria-label={`${totalNotificationCount} notifikasi belum dibaca`}>
          {totalNotificationCount > 99 ? "99+" : totalNotificationCount}
        </b>
      )}
    </button>
  );
  const filtered = bundle.schedules.filter(
    (s) =>
      (!filterDate || dateKey(s.departure_at) === filterDate) &&
      (!route || s.route_id === route) &&
      (!search ||
        `${s.routes.name} ${s.routes.origin} ${s.routes.destination} ${s.buses.name} ${s.routes.route_stops.map((r) => r.stops.name).join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!time ||
        (time === "morning"
          ? Number(timeLabel(s.departure_at).slice(0, 2)) < 12
          : Number(timeLabel(s.departure_at).slice(0, 2)) >= 12)),
  );
  const orders = bundle.bookings.filter(
    (b) =>
      (orderFilter === "all" ||
        (orderFilter === "cancelled" && b.status === "cancelled") ||
        (orderFilter === "upcoming" &&
          b.status === "confirmed" &&
          new Date(b.schedules.departure_at).getTime() > Date.now()) ||
        (orderFilter === "past" &&
          b.status !== "cancelled" &&
          new Date(b.schedules.departure_at).getTime() <= Date.now())) &&
      `${b.booking_code} ${b.profiles?.full_name || ""} ${b.schedules.routes.name}`
        .toLowerCase()
        .includes(orderSearch.toLowerCase()),
  );
  return (
    <div className={`app-shell ${demo ? "is-demo" : ""} ${sidebarExpanded ? "sidebar-expanded" : "sidebar-mini"} ${drawerOpen ? "drawer-open" : ""}`}>
      <aside className="app-sidebar" id="main-sidebar" aria-label="Menu utama">
        <div className="sidebar-head">
          <Brand />
          <button className="sidebar-drawer-close" aria-label="Tutup menu" onClick={() => setDrawerOpen(false)}>
            <X size={22} />
          </button>
        </div>
        <nav aria-label="Navigasi utama">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`sidebar-link ${page === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
              aria-current={page === n.id ? "page" : undefined}
              title={n.label}
              aria-label={n.id === "chat" && chatUnread ? `${n.label}, ${chatUnread} pesan baru` : n.label}
            >
              <n.icon size={22} />
              <span>{n.label}</span>
              {n.id === "chat" && chatUnread > 0 && (
                <b className="chat-unread" aria-hidden="true">{chatUnread > 9 ? "9+" : chatUnread}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-promo">
          <p>
            Perjalanan
            <br />
            lebih mudah
            <br />
            <span>dengan UNSRI Bus</span>
          </p>
          <BusIllustration />
        </div>
        <button
          className="sidebar-logout flex w-full items-center justify-start gap-2 text-left text-red-600 hover:text-red-700"
          onClick={() => void logout()}
          disabled={busy}
          aria-label="Logout"
          title="Logout"
        >
          <LogOut size={17} />
          <span>{demo ? "Keluar pratinjau" : "Keluar akun"}</span>
        </button>
      </aside>
      <button className="sidebar-backdrop" aria-label="Tutup menu" tabIndex={drawerOpen ? 0 : -1} onClick={() => setDrawerOpen(false)} />
      <div className="app-workspace">
        <header className="app-header">
          <button
            className="nav-toggle"
            aria-label={compactViewport ? (drawerOpen ? "Tutup menu" : "Buka menu") : (sidebarExpanded ? "Perkecil sidebar" : "Perluas sidebar")}
            title={compactViewport ? "Menu" : (sidebarExpanded ? "Perkecil sidebar" : "Perluas sidebar")}
            aria-controls="main-sidebar"
            aria-expanded={compactViewport ? drawerOpen : sidebarExpanded}
            onClick={() => {
              if (compactViewport) {
                setDrawerOpen((value) => !value);
                return;
              }
              setSidebarExpanded((value) => {
                const next = !value;
                try { localStorage.setItem("unsri-sidebar", next ? "expanded" : "mini"); } catch {}
                return next;
              });
            }}
          >
            {compactViewport && drawerOpen ? <X size={22} /> : <Menu size={23} />}
          </button>
          <div className="mobile-brand">
            <Brand />
          </div>
          <div className="header-title">
            <span>{page === "dashboard" ? greetingText : "UNSRI Bus"}</span>
            <h1>
              {page === "dashboard"
                ? admin
                  ? "Dashboard Admin"
                  : "Perjalanan Hari Ini"
                : page === "settings" ? "Pengaturan" : nav.find((n) => n.id === page)?.label}
            </h1>
            <p>{dateLabel(today())}</p>
          </div>
          <FeatureSearch admin={admin} onSelect={openFeature} />
          {notificationButton}
          <ProfileDropdown profile={profile} busy={busy} currentPage={page} onNavigate={navigate} onLogout={() => void logout()} />
        </header>
        <main className="app-content">
          <div className="mobile-title">
            <span>{greetingText}</span>
            <h1>
              {page === "dashboard"
                ? admin
                  ? "Dashboard Admin"
                  : "Perjalanan Hari Ini"
                : page === "settings" ? "Pengaturan" : nav.find((n) => n.id === page)?.label}
            </h1>
            <p>{dateLabel(today())}</p>
          </div>
          {demo && (
            <div className="demo-ribbon">
              <span>
                <i /> Mode pratinjau · Semua data adalah simulasi
              </span>
              <a href="/login">
                Masuk ke akun <ArrowRight size={13} />
              </a>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                onClick={() => {
                  setLoading(true);
                  refresh()
                    .catch((e) => setError(e.message))
                    .finally(() => setLoading(false));
                }}
              >
                Coba lagi
              </button>
              <button aria-label="Tutup pesan" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading-state">
              <span className="spinner" /> Memuat perjalananmu…
            </div>
          ) : (
            <>
              {page === "dashboard" &&
                (admin ? (
                  <AdminOverview bundle={bundle} navigate={navigate} />
                ) : (
                  <Dashboard
                    bookings={bundle.bookings}
                    schedules={bundle.schedules}
                    buses={bundle.buses}
                    selected={date}
                    setSelected={setDate}
                    offset={offset}
                    setOffset={setOffset}
                    navigate={navigate}
                    onBook={setReservation}
                    onTicket={setTicket}
                    onFleet={() => setFleetOpen(true)}
                  />
                ))}
              {page === "schedules" && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>Temukan perjalananmu</h1>
                      <p>Jadwal yang pas untuk setiap rencana.</p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() =>
                        void refresh()
                          .then(() => setToast("Jadwal diperbarui."))
                          .catch((e) => setError(e.message))
                      }
                    >
                      <RefreshCw size={16} /> Muat ulang
                    </button>
                  </div>
                  <div className="schedule-filters">
                    <label>
                      Tanggal
                      <input
                        type="date"
                        min={today()}
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                      />
                    </label>
                    <label>
                      Rute
                      <select
                        value={route}
                        onChange={(e) => setRoute(e.target.value)}
                      >
                        <option value="">Semua rute</option>
                        {bundle.routes.map((r) => (
                          <option value={r.id} key={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Waktu
                      <select
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      >
                        <option value="">Semua waktu</option>
                        <option value="morning">Pagi (sebelum 12:00)</option>
                        <option value="afternoon">Siang & sore</option>
                      </select>
                    </label>
                    <label>
                      Pencarian
                      <input
                        placeholder="Rute, halte, atau armada…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setFilterDate("");
                        setRoute("");
                        setTime("");
                        setSearch("");
                      }}
                    >
                      Atur ulang
                    </button>
                  </div>
                  <p className="result-count">
                    {filtered.length} jadwal ditemukan · Waktu Indonesia Barat
                  </p>
                  <div className="schedule-list">
                    {filtered.map((s) => (
                      <article className="schedule-card" key={s.id}>
                        <div className="schedule-card-top">
                          <span>
                            <CalendarDays size={16} />
                            {dateLabel(s.departure_at)}
                          </span>
                          <span
                            className={`tag ${bookable(s) ? "green" : "grey"}`}
                          >
                            {s.status === "cancelled"
                              ? "Dibatalkan"
                              : s.available === 0
                                ? "Penuh"
                                : !bookable(s)
                                  ? "Pemesanan ditutup"
                                  : `${s.available} kursi tersedia`}
                          </span>
                        </div>
                        <div className="schedule-route">
                          <div>
                            <strong>{timeLabel(s.departure_at)}</strong>
                            <span>{s.routes.origin}</span>
                          </div>
                          <div className="route-line">
                            <i />
                            <BusFront size={22} />
                            <i />
                          </div>
                          <div>
                            <strong>{timeLabel(s.arrival_at)}</strong>
                            <span>{s.routes.destination}</span>
                          </div>
                        </div>
                        <div className="schedule-card-bottom">
                          <span>
                            <BusFront size={16} />
                            {s.buses.name}
                          </span>
                          <span>
                            <MapPin size={16} />
                            {
                              s.routes.route_stops.find((r) => r.pickup_allowed)
                                ?.stops.name
                            }
                          </span>
                          <strong>
                            {money(s.fare_idr)}
                            <small>Info tarif</small>
                          </strong>
                          <button
                            className="button primary"
                            disabled={!bookable(s) || admin}
                            onClick={() => setReservation(s)}
                          >
                            {s.available === 0 ? "Kursi penuh" : "Pilih kursi"}
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!filtered.length && (
                    <Empty
                      icon={CalendarDays}
                      title="Jadwal belum tersedia"
                      copy="Coba tanggal atau rute lain untuk menemukan perjalanan."
                    />
                  )}
                </>
              )}
              {page === "orders" && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>{admin ? "Data pesanan" : "Pesanan saya"}</h1>
                      <p>
                        Tiket, rencana perjalanan, dan riwayat dalam satu
                        tempat.
                      </p>
                    </div>
                    {!admin && (
                      <button
                        className="button primary"
                        onClick={() => navigate("schedules")}
                      >
                        Pesan perjalanan <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                  <div className="orders-toolbar">
                    <div className="segments">
                      {[
                        ["upcoming", "Mendatang"],
                        ["past", "Riwayat"],
                        ["cancelled", "Dibatalkan"],
                        ["all", "Semua"],
                      ].map(([id, title]) => (
                        <button
                          key={id}
                          className={orderFilter === id ? "active" : ""}
                          onClick={() => setOrderFilter(id)}
                        >
                          {title}
                        </button>
                      ))}
                    </div>
                    <input
                      aria-label="Cari pesanan"
                      placeholder="Cari kode, nama, atau rute…"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                  </div>
                  <div className="order-grid">
                    {orders.map((b) => (
                      <article className="order-card" key={b.id}>
                        <div className="order-top">
                          <span>
                            <Ticket size={17} />
                            {b.booking_code}
                          </span>
                          <span
                            className={`tag ${b.status === "cancelled" ? "red" : "green"}`}
                          >
                            {b.status === "cancelled"
                              ? "Dibatalkan"
                              : "Terkonfirmasi"}
                          </span>
                        </div>
                        <div className="order-content">
                          <h2>
                            {b.schedules.routes.origin} <ArrowRight size={18} />{" "}
                            {b.schedules.routes.destination}
                          </h2>
                          <p>
                            <CalendarDays size={16} />
                            {dateLabel(b.schedules.departure_at, true)} ·{" "}
                            {timeLabel(b.schedules.departure_at)} WIB
                          </p>
                          <p>
                            <BusFront size={16} />
                            {b.schedules.buses.name} · Kursi{" "}
                            {b.schedule_seats.seat_label}
                          </p>
                          {admin && (
                            <p>
                              <UserRound size={16} />
                              {b.profiles?.full_name} · {b.profiles?.nim}
                            </p>
                          )}
                          <button
                            className="button secondary"
                            onClick={() => setTicket(b)}
                          >
                            Lihat tiket <ChevronRight size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!orders.length && (
                    <Empty
                      icon={Ticket}
                      title="Belum ada pesanan"
                      copy="Perjalanan pada kategori ini akan muncul di sini."
                      action={
                        !admin ? (
                          <button
                            className="button primary"
                            onClick={() => navigate("schedules")}
                          >
                            Cari jadwal
                          </button>
                        ) : undefined
                      }
                    />
                  )}
                </>
              )}
              {page === "chat" && (
                <Chat profile={profile} demo={demo} onError={setError} onUnreadChange={setChatUnread} />
              )}
              {(page === "profile" || page === "settings") && (
                <ProfileForm
                  settings={page === "settings"}
                  profile={profile}
                  demo={demo}
                  onUpdate={(p) => {
                    setProfile(p);
                    setToast("Profil berhasil diperbarui.");
                  }}
                  onLogout={() => void logout()}
                />
              )}
              {page === "manage" && admin && (
                <Management key={managementTab} initialTab={managementTab} {...bundle} onRefresh={refresh} demo={demo} />
              )}
              {page === "students" && admin && <Students />}
            </>
          )}
          <p className="app-disclaimer">
            Prototipe independen, bukan layanan resmi Universitas Sriwijaya.
          </p>
        </main>
      </div>
      <nav
        className={`bottom-nav ${admin ? "admin-bottom" : ""}`}
        aria-label="Navigasi mobile"
      >
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => navigate(n.id)}
            className={`${page === n.id ? "active" : ""} ${n.id === "schedules" ? "nav-schedule" : ""}`}
            aria-current={page === n.id ? "page" : undefined}
            aria-label={n.id === "chat" && chatUnread ? `${n.label}, ${chatUnread} pesan baru` : n.label}
          >
            <span>
              {n.id === "schedules" ? (
                <BusFront size={24} />
              ) : (
                <n.icon size={23} />
              )}
            </span>
            <small>{n.mobileLabel}</small>
            {n.id === "chat" && chatUnread > 0 && (
              <b className="chat-unread" aria-hidden="true">{chatUnread > 9 ? "9+" : chatUnread}</b>
            )}
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {reservation && (
        <Reservation
          schedule={reservation}
          demo={demo}
          existing={bundle.bookings}
          onClose={() => setReservation(null)}
          onSuccess={(b) => void booked(b)}
        />
      )}
      {ticket && !cancel && (
        <TicketView
          booking={ticket}
          profile={profile}
          demo={demo}
          onClose={() => setTicket(null)}
          onCancel={setCancel}
        />
      )}
      {cancel && (
        <Dialog
          title="Batalkan perjalanan ini?"
          description="Kursi akan dilepas dan tiket tidak dapat dipakai kembali."
          onClose={() => {
            if (!busy) setCancel(null);
          }}
        >
          <p>
            {cancel.schedules.routes.origin} →{" "}
            {cancel.schedules.routes.destination}
            <br />
            {dateLabel(cancel.schedules.departure_at)} ·{" "}
            {timeLabel(cancel.schedules.departure_at)} WIB
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setCancel(null)}
            >
              Kembali
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => void cancelBooking()}
            >
              {busy ? "Membatalkan…" : "Ya, batalkan"}
            </button>
          </div>
        </Dialog>
      )}
      {notificationOpen && (
        <Dialog
          title="Notifikasi"
          description="Informasi terbaru tentang perjalanan dan pesan Anda."
          onClose={() => setNotificationOpen(false)}
        >
          {chatUnread > 0 && (
            <button className="chat-notice-summary" onClick={() => { setNotificationOpen(false); navigate("chat"); }}>
              <MessageCircle size={19} />
              <span><strong>{chatUnread} pesan chat belum dibaca</strong><small>Buka halaman chat</small></span>
              <ChevronRight size={17} />
            </button>
          )}
          {bundle.notices.length ? (
            <>
              <div className="notification-list">
                {bundle.notices.map((n) => (
                  <article key={n.id} className={n.read_at ? "" : "unread"}>
                    <Bell size={18} />
                    <div>
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                      <small>
                        {dateLabel(n.created_at, true)} ·{" "}
                        {timeLabel(n.created_at)}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
              <button
                className="button secondary full"
                onClick={async () => {
                  try {
                    await request("notifications/read", {});
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Tandai semua sudah dibaca
              </button>
            </>
          ) : (
            <Empty
              icon={Bell}
              title="Semua sudah terbaca"
              copy="Notifikasi pemesanan dan balasan admin akan muncul di sini."
            />
          )}
        </Dialog>
      )}
      {fleetOpen && (
        <Dialog title="Status armada" onClose={() => setFleetOpen(false)}>
          <div className="fleet-list">
            {bundle.buses.map((b) => (
              <div key={b.id}>
                <BusFront />
                <div>
                  <strong>{b.name}</strong>
                  <small>
                    {b.plate_number} · {b.capacity} kursi
                  </small>
                </div>
                <span
                  className={`tag ${b.status === "operating" ? "green" : "amber"}`}
                >
                  {b.status === "operating"
                    ? "Beroperasi"
                    : b.status === "maintenance"
                      ? "Perawatan"
                      : "Nonaktif"}
                </span>
              </div>
            ))}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Empty({
  icon: Icon,
  title,
  copy,
  action,
}: {
  icon: typeof Ticket;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={27} />
      </span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  );
}
function AdminOverview({
  bundle,
  navigate,
}: {
  bundle: Bundle;
  navigate: (s: string) => void;
}) {
  const upcoming = bundle.schedules.filter(
    (s) =>
      s.status === "scheduled" &&
      new Date(s.departure_at).getTime() > Date.now(),
  );
  const capacity = upcoming.reduce((n, s) => n + s.capacity, 0),
    occupied = upcoming.reduce((n, s) => n + s.capacity - s.available, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Operasional dalam kendali.</h1>
          <p>Ringkasan perjalanan dan reservasi bus kampus.</p>
        </div>
        <button className="button primary" onClick={() => navigate("manage")}>
          Kelola jadwal <ArrowRight size={16} />
        </button>
      </div>
      <div className="admin-metrics">
        {[
          [CalendarDays, "Jadwal mendatang", upcoming.length],
          [
            Ticket,
            "Pesanan hari ini",
            bundle.bookings.filter((b) => dateKey(b.created_at) === today())
              .length,
          ],
          [
            BusFront,
            "Armada beroperasi",
            bundle.buses.filter((b) => b.status === "operating").length,
          ],
          [
            Users,
            "Okupansi mendatang",
            `${capacity ? Math.round((occupied / capacity) * 100) : 0}%`,
          ],
        ].map(([Icon, label, value]) => {
          const C = Icon as typeof Ticket;
          return (
            <div className="panel" key={String(label)}>
              <C />
              <span>{String(label)}</span>
              <strong>{String(value)}</strong>
            </div>
          );
        })}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Pesanan terbaru</h2>
          <button className="text-link" onClick={() => navigate("orders")}>
            Lihat semua
          </button>
        </div>
        <div className="table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                <th>Mahasiswa</th>
                <th>Perjalanan</th>
                <th>Kursi</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bundle.bookings.slice(0, 8).map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.profiles?.full_name}</strong>
                    <small>{b.profiles?.nim}</small>
                  </td>
                  <td>
                    {b.schedules.routes.name}
                    <small>{dateLabel(b.schedules.departure_at, true)}</small>
                  </td>
                  <td>{b.schedule_seats.seat_label}</td>
                  <td>
                    <span className="tag green">{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!bundle.bookings.length && (
          <Empty
            icon={Ticket}
            title="Belum ada pesanan"
            copy="Reservasi mahasiswa akan tampil secara otomatis."
          />
        )}
      </section>
    </>
  );
}
function ProfileForm({
  settings = false,
  profile,
  demo,
  onUpdate,
  onLogout,
}: {
  settings?: boolean;
  profile: Profile;
  demo: boolean;
  onUpdate: (p: Profile) => void;
  onLogout: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>, password = false) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (password) {
        if (data.password !== data.confirm)
          throw Error("Konfirmasi kata sandi tidak sama.");
        if (demo)
          throw Error(
            "Perubahan kata sandi hanya tersedia untuk akun Supabase.",
          );
        await request("profile/password", {
          current_password: data.current_password,
          password: data.password,
        });
        form.reset();
        setSuccess("Kata sandi diperbarui.");
      } else {
        onUpdate(
          demo
            ? ({ ...profile, ...data } as Profile)
            : await request<Profile>("profile", data, "PATCH"),
        );
        setSuccess("Profil diperbarui.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{settings ? "Pengaturan akun" : "Profil saya"}</h1>
          <p>Informasi pribadi dan keamanan akunmu.</p>
        </div>
        <button className="button secondary" onClick={onLogout}>
          <LogOut size={16} /> Keluar
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="form-success">
          {success}
        </p>
      )}
      <div className="profile-layout">
        <section className="panel">
          <div className="profile-summary">
            <span className="avatar">{initials(profile.full_name)}</span>
            <div>
              <h2>{profile.full_name}</h2>
              <p>{profile.email}</p>
            </div>
          </div>
          <form onSubmit={(e) => void submit(e)}>
            <div className="form-grid">
              <label>
                Nama lengkap
                <input
                  name="full_name"
                  defaultValue={profile.full_name}
                  required
                  minLength={3}
                  maxLength={80}
                />
              </label>
              <label>
                NIM
                <input defaultValue={profile.nim} readOnly disabled />
              </label>
              <label>
                Email
                <input defaultValue={profile.email} readOnly disabled />
              </label>
              <label>
                Nomor telepon
                <input
                  name="phone"
                  defaultValue={profile.phone}
                  maxLength={25}
                />
              </label>
              <AcademicFields faculty={profile.faculty} program={profile.program} demo={demo} />
            </div>
            <button className="button primary" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan perubahan"}
            </button>
          </form>
        </section>
        <section className="panel">
          <h2>Keamanan akun</h2>
          <p className="muted section-note">
            Gunakan kata sandi unik dengan minimal 8 karakter.
          </p>
          <form onSubmit={(e) => void submit(e, true)}>
            <label>
              Kata sandi saat ini
              <input
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              Kata sandi baru
              <input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            <label>
              Konfirmasi kata sandi
              <input
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <button className="button secondary full" disabled={busy}>
              Ubah kata sandi
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
function Students() {
  const [students, setStudents] = useState<Profile[]>([]),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    request<Profile[]>("admin/students")
      .then(setStudents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Mahasiswa</h1>
          <p>Data akun mahasiswa yang terdaftar.</p>
        </div>
        <input
          aria-label="Cari mahasiswa"
          placeholder="Cari nama atau NIM…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="panel table-scroll">
        <table className="management-table">
          <thead>
            <tr>
              <th>Nama / NIM</th>
              <th>Email</th>
              <th>Fakultas</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {students
              .filter((p) =>
                `${p.full_name} ${p.nim}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.full_name}</strong>
                    <small>{p.nim}</small>
                  </td>
                  <td>{p.email}</td>
                  <td>{p.faculty || "—"}</td>
                  <td>{p.status === "active" ? "Aktif" : "Ditangguhkan"}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {loading ? (
          <div className="loading-state">Memuat mahasiswa…</div>
        ) : (
          !students.length && (
            <Empty
              icon={Users}
              title="Belum ada mahasiswa"
              copy="Akun baru akan muncul setelah pendaftaran."
            />
          )
        )}
      </div>
    </>
  );
}
function Chat({
  profile,
  demo,
  onError,
  onUnreadChange,
}: {
  profile: Profile;
  demo: boolean;
  onError: (s: string) => void;
  onUnreadChange: (count: number) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]),
    [selected, setSelected] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [live, setLive] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const admin = profile.role === "admin";
  useEffect(() => {
    if (demo) {
      setConversations([
        { id: "demo-chat", student_id: profile.id, status: "open" },
      ]);
      setSelected("demo-chat");
      setLoading(false);
      return;
    }
    request<Conversation[]>("conversations")
      .then((c) => {
        setConversations(c);
        setSelected(c[0]?.id || "");
      })
      .catch((e) => onError(e.message))
      .finally(() => setLoading(false));
  }, [demo, profile.id, onError, onUnreadChange]);
  useEffect(() => {
    onUnreadChange(
      conversations.reduce(
        (sum, conversation) => sum + (conversation.unread_count || 0),
        0,
      ),
    );
  }, [conversations, onUnreadChange]);
  useEffect(() => {
    if (!selected || demo) return;
    let active = true;
    setLoading(true);
    const load = () =>
      request<Message[]>(`messages/${selected}`)
        .then((m) => {
          if (active) setMessages(m);
          if (active) {
            setConversations((current) => {
              return current.map((conversation) => conversation.id === selected ? { ...conversation, unread_count: 0 } : conversation);
            });
          }
        })
        .catch((e) => {
          if (active) onError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    void load();
    const client = supabaseBrowser();
    const channel = client
      ?.channel(`chat-${selected}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selected}`,
        },
        () => {
          void load();
        },
      )
      .subscribe((status: string) => setLive(status === "SUBSCRIBED"));
    // Reconcile after reconnect or an event arriving during initial subscription.
    const interval = setInterval(() => void load(), 15000);
    return () => {
      active = false;
      clearInterval(interval);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [selected, demo, onError, onUnreadChange]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || busy || !selected) return;
    setBusy(true);
    try {
      if (demo)
        setMessages((old) => [
          ...old,
          {
            id: crypto.randomUUID(),
            conversation_id: selected,
            sender_id: profile.id,
            body: body.trim(),
            created_at: new Date().toISOString(),
          },
        ]);
      else {
        await request(`messages/${selected}`, { body: body.trim() });
        setMessages(await request<Message[]>(`messages/${selected}`));
      }
      setBody("");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const contact = conversations.find((c) => c.id === selected);
  return (
    <>
      <div className={`page-heading chat-page-heading ${admin ? "" : "student"}`}>
        <div>
          <h1>Chat bantuan</h1>
          <p>Ada pertanyaan? Kami siap membantu perjalananmu.</p>
        </div>
        {admin && selected && (
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await request("admin/manage", {
                  kind: "close_conversation",
                  id: selected,
                  data: {},
                });
                setConversations((old) =>
                  old.map((c) =>
                    c.id === selected ? { ...c, status: "closed" } : c,
                  ),
                );
              } catch (e) {
                onError((e as Error).message);
              }
            }}
          >
            Tutup percakapan
          </button>
        )}
      </div>
      {demo && (
        <div className="notice">
          Pesan demo hanya tampil di perangkat ini dan tidak dikirim kepada
          admin.
        </div>
      )}
      <div className="chat-layout panel">
        <aside className="chat-contacts">
          <h2>{admin ? "Kotak masuk" : "Pusat bantuan"}</h2>
          {admin ? (
            conversations.map((c) => (
              <button
                key={c.id}
                className={selected === c.id ? "selected" : ""}
                onClick={() => setSelected(c.id)}
              >
                <span className="avatar">
                  {initials(c.profiles?.full_name || "M")}
                </span>
                <span>
                  <strong>{c.profiles?.full_name}</strong>
                  <small>
                    {c.status === "closed" ? "Selesai" : c.profiles?.nim}
                  </small>
                </span>
                {(c.unread_count || 0) > 0 && <b className="contact-unread">{c.unread_count! > 99 ? "99+" : c.unread_count}</b>}
              </button>
            ))
          ) : (
            <button className="selected">
              <span className="support-avatar">
                <Headphones />
              </span>
              <span>
                <strong>Admin Transportasi</strong>
                <small>Bantuan jadwal & tiket</small>
              </span>
            </button>
          )}
        </aside>
        <section className="chat-thread">
          <header>
            <span className="support-avatar">
              <MessageCircle />
            </span>
            <div>
              <strong>
                {admin
                  ? contact?.profiles?.full_name || "Pilih percakapan"
                  : "Admin Transportasi"}
              </strong>
              <small>
                {demo
                  ? "Simulasi percakapan"
                  : live
                    ? "Terhubung · Pembaruan langsung"
                    : "Menyinkronkan pesan"}
              </small>
            </div>
            {contact?.status === "closed" && (
              <span className="tag grey">Selesai</span>
            )}
          </header>
          <div className="chat-messages">
            {loading ? (
              <div className="loading-state">Memuat pesan…</div>
            ) : messages.length ? (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`message ${m.sender_id === profile.id ? "own" : ""}`}
                >
                  <p>{m.body}</p>
                  <small>
                    {dateLabel(m.created_at, true)} · {timeLabel(m.created_at)}{" "}
                    WIB
                  </small>
                </div>
              ))
            ) : (
              <Empty
                icon={MessageCircle}
                title="Mulai percakapan"
                copy="Tanyakan informasi jadwal, halte, atau pemesanan kepada admin."
              />
            )}
            <div ref={end} />
          </div>
          <form className="chat-compose" onSubmit={(e) => void send(e)}>
            <input
              aria-label="Tulis pesan"
              placeholder="Ketik pesan kamu di sini…"
              maxLength={1000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={!selected}
              required
            />
            <button
              className="button primary"
              disabled={busy || !selected || !body.trim()}
              aria-label="Kirim pesan"
            >
              <Send size={18} />
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
