"use strict"; // Archived SQLite client. Run only with npm run legacy.

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [
  ...scope.querySelectorAll(selector),
];
const iconPaths = {
  bus: '<rect x="4" y="3" width="16" height="17" rx="4"/><path d="M4 12h16M8 20v2m8-2v2M8 7h8"/><path d="M8 16h.01M16 16h.01"/>',
  dashboard:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  ticket:
    '<path d="M3 7a2 2 0 0 0 0 4v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0 0-4V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1Z"/><path d="M13 5v2m0 3v2m0 3v2"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-8.4 8.4 9 9 0 0 1-4.2-1.1L3 21l2.2-5.4A8.8 8.8 0 0 1 3 11.5a9 9 0 1 1 18 0Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  arrowRight: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mapPin:
    '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15m6-12v15"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  filter: '<path d="M4 7h16M7 12h10m-7 5h4"/>',
  location: '<path d="m3 11 19-8-8 19-2-9-9-2Z"/>',
  shield:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  sparkles:
    '<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3ZM5 18l.6 1.4L7 20l-1.4.6L5 22l-.6-1.4L3 20l1.4-.6L5 18Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',
  steering:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M3 12h6m6 0h6m-9 3v6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="m3 3 18 18M10.6 5.1c.5-.1.9-.1 1.4-.1 6.5 0 10 7 10 7a16.3 16.3 0 0 1-3.4 4.1M6.4 6.4C3.5 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.3"/><path d="M10 10a3 3 0 0 0 4 4"/>',
  refresh:
    '<path d="M20 11a8 8 0 0 0-14-5L4 8m0-5v5h5M4 13a8 8 0 0 0 14 5l2-2m0 5v-5h-5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  trash: '<path d="M3 6h18m-2 0-1 15H6L5 6m3 0V4h8v2m-6 4v7m4-7v7"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
  creditCard:
    '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>',
  alert:
    '<path d="m10.3 3.9-8.2 14a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3l-8.2-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0M12 20h.01"/>',
};
const I = (name, cls = "") =>
  `<span class="icon ${cls}" aria-hidden="true"><svg viewBox="0 0 24 24">${iconPaths[name] || iconPaths.info}</svg></span>`;
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
const rupiah = (n) =>
  Number(n) === 0
    ? "Gratis"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(Number(n));
const dateFull = (s) => {
  if (!s) return "-";
  return new Date(s + "T12:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
};
const dateShort = (s) => {
  if (!s) return "-";
  return new Date(s + "T12:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
};
const timeWIB = (s) =>
  s
    ? new Date(s.replace(" ", "T") + "Z").toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      })
    : "-";
const nowLocal = () =>
  new Date(Date.now() + 7 * 3600000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 16);
const tripFuture = (t) => `${t.date} ${t.departure_time}` > nowLocal();
const initials = (name) =>
  String(name || "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0] || "")
    .join("")
    .toUpperCase();
const available = (t) =>
  Math.max(0, Number(t.capacity) - Number(t.booked_count || 0));
const roleName = (r) => (r === "admin" ? "Administrator" : "Mahasiswa");
const statusTag = (s) =>
  s === "confirmed"
    ? '<span class="badge green">' +
      I("check", "ic-sm") +
      " Dikonfirmasi</span>"
    : s === "active"
      ? '<span class="badge green">Aktif</span>'
      : '<span class="badge red">Dibatalkan</span>';
const el = document.getElementById("app");
let state = {
  user: null,
  screen: "landing",
  page: "dashboard",
  trips: [],
  bookings: [],
  stats: null,
  conversations: [],
  activeConversation: null,
  messages: [],
  studentList: [],
  filters: { route: "all", date: "", search: "" },
  orderFilter: "all",
  orderSearch: "",
  sidebar: false,
  seat: null,
  selectedTrip: null,
  occupied: [],
  chatPoll: null,
};

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let json;
  try {
    json = await response.json();
  } catch {
    throw Error("Server tidak memberikan respons yang valid.");
  }
  if (!response.ok) {
    if (response.status === 401 && state.user && url !== "/api/auth/login") {
      state.user = null;
      state.screen = "auth";
      state.authMode = "login";
      render();
    }
    throw Error(json.error || "Permintaan tidak berhasil.");
  }
  return json.data;
}
const post = (url, b) => api(url, { method: "POST", body: JSON.stringify(b) });
const patch = (url, b) =>
  api(url, { method: "PATCH", body: JSON.stringify(b) });
function toast(msg, error = false) {
  const host = document.getElementById("toast-region");
  const t = document.createElement("div");
  t.className = `toast ${error ? "error" : ""}`;
  t.innerHTML =
    I(error ? "alert" : "checkCircle", "ic-sm") + `<span>${esc(msg)}</span>`;
  host.append(t);
  setTimeout(() => t.remove(), 3700);
}
function logo(white = false) {
  return `<div class="logo"><span class="logo-mark">${I("bus", "ic-xl")}</span><div>UNSRI Bus<span class="sub-brand">Student Transport</span></div></div>`;
}
function stopPoll() {
  if (state.chatPoll) {
    clearInterval(state.chatPoll);
    state.chatPoll = null;
  }
}
function showAuth(mode = "login") {
  stopPoll();
  state.authMode = mode;
  state.screen = "auth";
  state.sidebar = false;
  render();
  window.scrollTo(0, 0);
}
function showLanding() {
  stopPoll();
  state.screen = "landing";
  state.sidebar = false;
  render();
  window.scrollTo(0, 0);
}
async function navigate(page) {
  stopPoll();
  state.page = page;
  state.sidebar = false;
  state.screen = "app";
  renderApp(true);
  try {
    if (page === "dashboard") state.stats = await api("/api/dashboard");
    if (page === "trips" || page === "schedules")
      state.trips = await api("/api/trips");
    if (page === "orders") state.bookings = await api("/api/bookings");
    if (page === "chat") {
      if (state.user.role === "admin") {
        state.conversations = await api("/api/chat/conversations");
        if (
          !state.activeConversation ||
          !state.conversations.some((c) => c.id === state.activeConversation)
        )
          state.activeConversation = state.conversations[0]?.id || null;
      } else state.activeConversation = state.user.id;
      state.messages = state.activeConversation
        ? await api(`/api/chat/${state.activeConversation}`)
        : [];
    }
    if (page === "students")
      state.studentList = await api("/api/admin/students");
    renderApp(false);
    if (page === "trips") updateTripResults();
    if (page === "chat") {
      scrollChat();
      state.chatPoll = setInterval(async () => {
        if (state.page !== "chat" || !state.activeConversation) return;
        try {
          const messages = await api(`/api/chat/${state.activeConversation}`);
          if (
            messages.length !== state.messages.length ||
            messages.at(-1)?.id !== state.messages.at(-1)?.id
          ) {
            state.messages = messages;
            const box = $(".chat-messages");
            if (box) {
              const bottom =
                box.scrollHeight - box.scrollTop - box.clientHeight < 110;
              box.innerHTML = renderMessages();
              if (bottom) scrollChat();
            }
          }
        } catch {}
      }, 7000);
    }
  } catch (e) {
    renderApp(false);
    toast(e.message, true);
  }
  window.scrollTo(0, 0);
}
function render() {
  if (state.screen === "landing") return renderLanding();
  if (state.screen === "auth") return renderAuth();
  renderApp(false);
}
function renderLanding() {
  const scheduleCards = (state.trips || [])
    .filter((t) => t.status === "active" && tripFuture(t))
    .slice(0, 3)
    .map((t) => renderTripCard(t, true))
    .join("");
  el.innerHTML = `<div class="marketing">
    <header class="public-header">${logo()}<nav class="public-links"><a href="#cara-kerja">Cara kerja</a><a href="#jadwal">Jadwal bus</a><a href="#tentang">Tentang layanan</a></nav><div class="public-actions"><button class="btn btn-secondary" data-action="auth-login">Masuk</button><button class="btn btn-primary" data-action="auth-register">Daftar ${I("arrowRight", "ic-sm")}</button></div></header>
    <main><section class="hero"><div>
      <div class="hero-label"><span class="dot"></span> Platform Transportasi Kampus · Demo</div>
      <h1>Perjalanan ke kampus, <em>jadi lebih mudah.</em></h1>
      <p class="hero-description">Pesan kursi bus kampus Palembang–Indralaya dalam beberapa langkah. Cek jadwal, pilih tempat duduk, dan simpan tiketmu di satu tempat.</p>
      <div class="hero-actions"><button class="btn btn-primary btn-lg" data-action="auth-register">Mulai pesan tiket ${I("arrowRight")}</button><button class="btn btn-secondary btn-lg" data-action="auth-login">Sudah punya akun? Masuk</button></div>
      <div class="hero-social"><div class="hero-avatars"><i>A</i><i>R</i><i>N</i><i>D</i></div><span>Dibuat untuk pengalaman perjalanan<br>mahasiswa yang lebih praktis.</span></div>
    </div><div class="hero-visual"><div class="hero-orbit"></div><div class="hero-orbit two"></div><div class="hero-block"></div>
      <div class="visual-trip-card"><div class="visual-top"><div><div class="eyebrow">Your next journey</div><h3 style="font-size:18px;margin-top:5px">E-Ticket Bus Kampus</h3></div><span class="badge green">${I("check", "ic-sm")} Siap berangkat</span></div>
      <div class="mock-route"><div><strong>PLB</strong><small>Palembang</small></div><div class="mock-line"></div>${I("bus", "ic-lg")}<div style="text-align:right"><strong>IDL</strong><small>Indralaya</small></div></div>
      <div class="mock-bus"><div class="bus-illustration"><div class="bus-windows"><i></i><i></i><i></i><i></i><i></i></div></div></div><div class="mock-card-foot"><span>Rute Kampus<strong>Palembang – Indralaya</strong></span><span>Reservasi<strong>Mudah & teratur</strong></span></div></div>
      <div class="floating-tag float-one">${I("ticket")} Tiket digital</div><div class="floating-tag float-two">${I("shield")} Kursi terjamin*</div>
    </div></section>
    <section class="feature-strip" id="cara-kerja"><div class="feature"><div class="feature-icon">${I("calendar")}</div><div><strong>Pilih jadwal fleksibel</strong><p>Lihat jadwal berangkat yang tersedia.</p></div></div><div class="feature"><div class="feature-icon">${I("ticket")}</div><div><strong>Pesan kursi sendiri</strong><p>Pilih nomor kursi secara langsung.</p></div></div><div class="feature"><div class="feature-icon">${I("checkCircle")}</div><div><strong>E-ticket instan</strong><p>Tiket tersimpan di halaman pesanan.</p></div></div></section>
    <section id="jadwal" class="public-section"><div class="section-heading"><div><div class="eyebrow">JADWAL PERJALANAN</div><h2>Berangkat sesuai rencanamu.</h2><p>Contoh jadwal bus untuk simulasi pemesanan mahasiswa.</p></div><button class="btn btn-secondary" data-action="auth-login">Lihat semua jadwal ${I("arrowRight", "ic-sm")}</button></div><div class="public-schedules">${scheduleCards || `<div class="empty-state">${I("calendar")}<h3>Belum ada jadwal</h3></div>`}</div></section>
    <section id="tentang" class="public-section" style="padding-bottom:60px"><div class="notice-card" style="background:#f3f7f0;border-color:#e0e9df;color:#3e624c;display:flex;align-items:start;gap:15px">${I("info", "ic-lg")}<div><h3>Prototipe independen untuk kebutuhan pengembangan</h3><p>Website ini adalah proyek demonstrasi, bukan sistem resmi Universitas Sriwijaya. Identitas, bus, jadwal, tarif, dan data penumpang yang ditampilkan merupakan contoh untuk pengujian alur aplikasi.</p></div></div></section></main>
    <footer class="footer"><span><b>UNSRI Bus</b> — Prototipe pemesanan transportasi kampus.</span><span>Dirancang untuk mahasiswa · © ${new Date().getFullYear()}</span></footer>
  </div>`;
}
function renderAuth() {
  const isRegister = state.authMode === "register";
  el.innerHTML = `<div class="auth-view"><div class="auth-brand-panel">${logo()}<div style="position:relative;z-index:1"><div class="eyebrow" style="color:#bee0c8;margin-bottom:20px">SMART CAMPUS MOBILITY</div><h2>Satu perjalanan, lebih sedikit kerumitan.</h2><p>Atur jadwal bus kampus, pilih kursi, dan akses tiket tanpa antre. Semua dari satu dashboard.</p></div><div class="auth-copy">UNSRI Bus · Project demo, bukan layanan resmi UNSRI.</div><div class="auth-decor"></div></div>
  <div class="auth-main"><button class="auth-back" data-action="landing">${I("arrowLeft", "ic-sm")} Kembali ke beranda</button><div class="auth-form-wrap"><div class="eyebrow">${isRegister ? "BUAT AKUN MAHASISWA" : "SELAMAT DATANG KEMBALI"}</div><h1>${isRegister ? "Daftar akun baru" : "Masuk ke akunmu"}</h1><p>${isRegister ? "Lengkapi data berikut untuk mulai menggunakan layanan bus kampus." : "Masuk untuk melihat jadwal, mengelola pesanan, dan mengakses tiketmu."}</p>
  <form id="authForm" class="stack" style="gap:0">${isRegister ? `<div class="field"><label for="name">Nama lengkap</label><input id="name" name="name" required minlength="3" maxlength="80" autocomplete="name" placeholder="Nama sesuai identitas mahasiswa" /></div><div class="field"><label for="nim">Nomor Induk Mahasiswa (NIM)</label><input id="nim" name="nim" required pattern="[0-9]{7,20}" inputmode="numeric" placeholder="Masukkan NIM" /></div>` : ""}
    <div class="field"><label for="identity">${isRegister ? "Email aktif" : "Email atau NIM"}</label><input id="identity" name="${isRegister ? "email" : "identity"}" ${isRegister ? 'type="email"' : 'type="text"'} required placeholder="${isRegister ? "nama@email.com" : "Email atau NIM terdaftar"}" autocomplete="${isRegister ? "email" : "username"}" /></div>
    <div class="field"><label for="password">Kata sandi</label><div class="input-wrap"><input id="password" name="password" type="password" required ${isRegister ? 'minlength="8"' : ""} autocomplete="${isRegister ? "new-password" : "current-password"}" placeholder="${isRegister ? "Minimal 8 karakter" : "Masukkan kata sandi"}" /><button class="input-suffix" type="button" aria-label="Tampilkan kata sandi" data-action="toggle-password" data-target="password">${I("eye")}</button></div>${isRegister ? '<span class="form-hint">Gunakan minimal 8 karakter untuk keamanan akun.</span>' : ""}</div>
    <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top:9px">${isRegister ? "Buat akun mahasiswa" : "Masuk ke dashboard"} ${I("arrowRight", "ic-sm")}</button>
  </form><div class="auth-alt">${isRegister ? "Sudah punya akun?" : "Belum memiliki akun?"} <button class="text-btn" data-action="${isRegister ? "auth-login" : "auth-register"}">${isRegister ? "Masuk di sini" : "Daftar sekarang"}</button></div>
  ${!isRegister ? `<div class="demo-box"><strong>Akun demo untuk mencoba aplikasi</strong><div>Admin: <b>admin@unsri.demo</b> / <b>Admin123!</b></div><div>Mahasiswa: <b>mahasiswa@unsri.demo</b> / <b>Mahasiswa123!</b></div></div>` : ""}
  </div></div></div>`;
}
const menusStudent = [
  ["dashboard", "dashboard", "Dashboard"],
  ["trips", "bus", "Cari tiket"],
  ["orders", "ticket", "Pesanan saya"],
  ["chat", "chat", "Chat bantuan"],
  ["profile", "user", "Profil"],
];
const menusAdmin = [
  ["dashboard", "dashboard", "Dashboard"],
  ["schedules", "calendar", "Jadwal bus"],
  ["orders", "ticket", "Data pesanan"],
  ["students", "users", "Mahasiswa"],
  ["chat", "chat", "Chat bantuan"],
  ["profile", "user", "Profil"],
];
const titleMap = {
  dashboard: "Dashboard",
  trips: "Cari tiket bus",
  schedules: "Manajemen jadwal bus",
  orders: "Pesanan",
  students: "Data mahasiswa",
  chat: "Chat bantuan",
  profile: "Profil akun",
};
const breadcrumbs = {
  dashboard: "Ringkasan aktivitas",
  trips: "Pemesanan bus",
  schedules: "Pengelolaan perjalanan",
  orders: "Manajemen tiket",
  students: "Pengguna terdaftar",
  chat: "Pusat bantuan",
  profile: "Pengaturan akun",
};
function shellNav() {
  const menus = state.user.role === "admin" ? menusAdmin : menusStudent;
  return `<aside class="sidebar ${state.sidebar ? "open" : ""}">${logo()}<div class="nav-label">MENU UTAMA</div><nav class="nav">${menus.map(([p, i, text]) => `<button class="nav-item ${state.page === p ? "active" : ""}" data-action="nav" data-page="${p}">${I(i)} <span>${text}</span></button>`).join("")}</nav>
  <div class="sidebar-note">${I("sparkles", "ic-lg")}<h4>Butuh bantuan?</h4><p>Hubungi admin transportasi langsung melalui fitur chat.</p><button class="btn btn-secondary btn-sm btn-block" data-action="nav" data-page="chat">Buka chat ${I("arrowRight", "ic-sm")}</button></div>
  <div class="sidebar-profile"><div class="avatar ${state.user.role === "admin" ? "yellow" : ""}">${esc(initials(state.user.name))}</div><div style="min-width:0"><strong>${esc(state.user.name)}</strong><small>${roleName(state.user.role)}</small></div><button class="logout" data-action="logout" title="Keluar akun" aria-label="Keluar akun">${I("logout")}</button></div></aside>`;
}
function renderApp(loading = false) {
  if (!state.user) return showLanding();
  const date = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const view = loading
    ? `<div class="loading-view"><span class="loader"></span>Memuat data...</div>`
    : views[state.page]?.() || studentDashboard();
  el.innerHTML = `<div class="shell">${state.sidebar ? '<div class="mobile-backdrop" data-action="sidebar-close"></div>' : ""}${shellNav()}<div class="app-main"><header class="topbar"><button class="mobile-hamburger" data-action="sidebar-open" aria-label="Buka menu">${I("menu")}</button><div class="topbar-location">${I("mapPin", "ic-sm")} <span>${esc(breadcrumbs[state.page] || "Beranda")}</span></div><div class="topbar-right"><div class="topbar-date">${I("calendar", "ic-sm")}${esc(date)}</div><span class="topbar-role">${roleName(state.user.role)}</span><div class="avatar ${state.user.role === "admin" ? "yellow" : ""}" style="width:33px;height:33px;flex-basis:33px">${esc(initials(state.user.name))}</div></div></header><main class="content">${view}</main></div></div><div id="modal-root"></div>`;
}
function heading(title, description, actions = "") {
  return `<div class="page-title"><div><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="page-title-actions">${actions}</div>` : ""}</div>`;
}
const metric = (label, value, ic, foot) =>
  `<div class="stat-card"><div class="stat-top"><span>${esc(label)}</span><div class="stat-icon">${I(ic)}</div></div><div><h3>${esc(value)}</h3><div class="stat-foot">${esc(foot)}</div></div></div>`;
function studentDashboard() {
  const s = state.stats || {
    active: 0,
    total: 0,
    upcoming: null,
    recommended: [],
  };
  const name = state.user.name.split(" ")[0];
  return `${heading(`Halo, ${esc(name)}! <span style="font-size:25px">👋</span>`, "Siap berangkat? Semua perjalananmu ada di sini.", `<button class="btn btn-primary" data-action="nav" data-page="trips">${I("plus", "ic-sm")} Pesan tiket</button>`)}
  <div class="stat-grid">${metric("Tiket aktif", s.active || 0, "ticket", "Perjalanan mendatang")}${metric("Total pesanan", s.total || 0, "calendar", "Semua riwayat pemesanan")}${metric("Rute tersedia", "2", "map", "Palembang ↔ Indralaya")}</div>
  <div class="dashboard-grid"><div class="stack" style="gap:20px"><div class="card card-pad"><div class="panel-header"><div><h2>Perjalanan berikutnya</h2><p>Informasi tiket keberangkatan terdekat</p></div><button class="text-btn small" data-action="nav" data-page="orders">Lihat pesanan ${I("chevronRight", "ic-sm")}</button></div>
  ${
    s.upcoming
      ? `<div class="ticket-highlight"><div class="row between"><span class="small" style="color:#c2e3d3">${I("ticket", "ic-sm")} E-TICKET AKTIF</span><span class="badge" style="background:#ffffff23;color:white">Kursi ${s.upcoming.seat_number}</span></div><div class="route-name">${esc(s.upcoming.origin)} ${I("arrowRight", "ic-lg")} ${esc(s.upcoming.destination)}</div><p style="color:#cee4d9;font-size:12px">${esc(s.upcoming.bus_name)} · ${esc(s.upcoming.plate)}</p><div class="bottom"><div class="meta">Tanggal keberangkatan<strong>${esc(dateShort(s.upcoming.date))}</strong></div><div class="meta">Waktu<strong>${esc(s.upcoming.departure_time)} WIB</strong></div><button class="btn btn-secondary btn-sm" data-action="ticket-detail" data-id="${s.upcoming.id}">Lihat tiket ${I("arrowRight", "ic-sm")}</button></div></div>`
      : `<div class="empty-ticket">${I("ticket", "ic-lg")}<h3>Belum ada perjalanan aktif</h3><p>Temukan jadwal yang sesuai dan pesan tempat dudukmu sekarang.</p><button class="btn btn-primary btn-sm" data-action="nav" data-page="trips">Cari jadwal bus ${I("arrowRight", "ic-sm")}</button></div>`
  }</div>
  <div class="card card-pad"><div class="panel-header"><div><h2>Jadwal keberangkatan terdekat</h2><p>Beberapa perjalanan yang masih tersedia</p></div><button class="text-btn small" data-action="nav" data-page="trips">Semua jadwal ${I("chevronRight", "ic-sm")}</button></div>${(s.recommended || []).length ? s.recommended.map((t) => `<div class="schedule-mini"><div class="schedule-time">${esc(t.departure_time)}</div><div class="schedule-line"></div><div class="grow"><strong>${esc(t.origin)} → ${esc(t.destination)}</strong><p>${esc(dateShort(t.date))} · ${available(t)} kursi tersisa</p></div><button class="btn btn-secondary btn-sm" data-action="book-trip" data-id="${t.id}">Pilih</button></div>`).join("") : `<p class="muted small">Belum ada perjalanan tersedia.</p>`}</div></div>
  <div class="stack" style="gap:20px"><div class="notice-card">${I("info", "ic-lg")}<h3>Informasi perjalanan</h3><p>Pastikan datang sebelum waktu keberangkatan dan simpan kode tiket untuk ditunjukkan kepada petugas. Jadwal dalam aplikasi ini merupakan data demo.</p></div><div class="card card-pad"><div class="panel-header"><h2>Akses cepat</h2></div>${[
    ["trips", "calendar", "Cari jadwal bus", "Temukan waktu keberangkatan"],
    ["orders", "ticket", "Tiket & riwayat", "Periksa semua pesananmu"],
    ["chat", "chat", "Hubungi admin", "Tanyakan kendala perjalanan"],
  ]
    .map(
      ([p, i, t, d]) =>
        `<button class="quick-action" data-action="nav" data-page="${p}"><span class="icon">${I(i)}</span><span class="grow"><strong>${t}</strong><small>${d}</small></span><span class="chev">${I("chevronRight", "ic-sm")}</span></button>`,
    )
    .join("")}</div></div></div>`;
}
function adminDashboard() {
  const s = state.stats || {
    students: 0,
    activeTrips: 0,
    confirmedBookings: 0,
    messages: 0,
    popular: [],
    recent: [],
  };
  return `${heading("Dashboard Admin", "Pantau aktivitas pemesanan dan operasional transportasi kampus.", `<button class="btn btn-primary" data-action="new-trip">${I("plus", "ic-sm")} Tambah jadwal</button>`)}
  <div class="stat-grid four">${metric("Mahasiswa terdaftar", s.students, "users", "Pengguna mahasiswa")}${metric("Jadwal aktif", s.activeTrips, "bus", "Jadwal mendatang")}${metric("Tiket terkonfirmasi", s.confirmedBookings, "ticket", "Semua perjalanan")}${metric("Pesan masuk/keluar", s.messages, "chat", "Total pesan bantuan")}</div>
  <div class="dashboard-grid"><div class="card"><div class="table-title"><div><h2>Pesanan terbaru</h2><p class="small muted" style="margin-top:5px">Aktivitas pemesanan mahasiswa</p></div><button class="text-btn small" data-action="nav" data-page="orders">Lihat semua ${I("chevronRight", "ic-sm")}</button></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Mahasiswa</th><th>Rute</th><th>Kursi</th><th>Status</th></tr></thead><tbody>${s.recent.length ? s.recent.map((b) => `<tr><td><strong>${esc(b.student_name)}</strong><div class="sub">${esc(b.student_nim)}</div></td><td><strong>${esc(b.origin)} → ${esc(b.destination)}</strong><div class="sub">${esc(dateShort(b.date))}</div></td><td>${b.seat_number}</td><td>${statusTag(b.status)}</td></tr>`).join("") : `<tr><td colspan="4">Belum ada pesanan.</td></tr>`}</tbody></table></div></div>
  <div class="stack" style="gap:18px"><div class="card card-pad"><div class="panel-header"><div><h2>Okupansi jadwal</h2><p>Jadwal dengan pemesanan terbanyak</p></div></div>${s.popular.length ? s.popular.map((t) => `<div style="margin-bottom:19px"><div class="row between small" style="margin-bottom:9px"><strong>${esc(t.origin)} → ${esc(t.destination)}</strong><span class="muted">${esc(dateShort(t.date))}</span></div><div class="occupancy"><div class="progress grow"><i style="width:${Math.min(100, Math.round((t.booked_count / t.capacity) * 100))}%"></i></div><small>${t.booked_count}/${t.capacity}</small></div></div>`).join("") : `<p class="muted small">Belum ada data jadwal.</p>`}</div><div class="notice-card">${I("shield", "ic-lg")}<h3>Akses khusus administrator</h3><p>Perubahan jadwal hanya dapat dilakukan admin. Saat jadwal dibatalkan, tiket terkait otomatis dibatalkan.</p></div></div></div>`;
}
function renderTripCard(t, compact = false) {
  const seats = available(t);
  const isPast = !tripFuture(t);
  const disabled = t.status !== "active" || seats <= 0 || isPast;
  return `<article class="trip-card"><div class="trip-top"><span class="trip-date">${I("calendar", "ic-sm")} ${esc(dateFull(t.date))}</span><span class="badge ${t.status === "cancelled" ? "red" : seats <= 4 ? "yellow" : "green"}">${t.status === "cancelled" ? "Dibatalkan" : seats <= 0 ? "Penuh" : `${seats} kursi tersedia`}</span></div>
  <div class="trip-main"><div class="trip-stops"><div class="trip-station"><h3>${esc(t.departure_time)}</h3><p>${esc(t.origin)}</p></div><div class="route-separator"><span></span>${I("arrowRight", "ic-sm")}<span></span></div><div class="trip-station"><h3>${esc(t.arrival_time)}</h3><p>${esc(t.destination)}</p></div></div></div>
  <div class="trip-meta"><div class="trip-meta-left"><span>${I("bus", "ic-sm")} ${esc(t.bus_name)}</span>${compact ? "" : `<span>${I("clock", "ic-sm")} Langsung</span>`}</div><div class="trip-footer-right"><span class="trip-price">${rupiah(t.price)}</span><button class="btn ${disabled ? "btn-secondary" : "btn-primary"} btn-sm" data-action="${compact ? "auth-login" : "book-trip"}" ${compact ? "" : `data-id="${t.id}" ${disabled ? "disabled" : ""}`}>${compact ? "Pesan" : "Pilih kursi"} ${I("arrowRight", "ic-sm")}</button></div></div></article>`;
}
function tripsPage() {
  return `${heading("Temukan perjalananmu", "Pilih rute, tanggal, dan kursi untuk perjalanan yang nyaman.", `<button class="btn btn-secondary" data-action="refresh-trips">${I("refresh", "ic-sm")} Muat ulang</button>`)}
  <div class="filters"><div class="filter-field"><label for="filterRoute">Rute perjalanan</label><select id="filterRoute" class="filter-select" data-filter="route"><option value="all">Semua rute</option><option value="Palembang">Palembang → Indralaya</option><option value="Indralaya">Indralaya → Palembang</option></select></div><div class="filter-field"><label for="filterDate">Tanggal berangkat</label><input type="date" id="filterDate" class="filter-input" data-filter="date" min="${nowLocal().slice(0, 10)}" value="${esc(state.filters.date)}" /></div><div class="filter-field search-field"><label for="filterSearch">Cari bus</label><input id="filterSearch" class="filter-input" placeholder="Cari nama bus atau kode..." data-filter="search" value="${esc(state.filters.search)}" /></div><button class="btn btn-secondary" data-action="reset-filters" style="height:41px">Atur ulang</button></div><div class="trip-results-count" id="tripCount"></div><div id="tripResults" class="trip-list"></div>`;
}
function updateTripResults() {
  const query = state.filters.search.toLowerCase();
  const matches = state.trips.filter(
    (t) =>
      t.status === "active" &&
      tripFuture(t) &&
      (state.filters.route === "all" || t.origin === state.filters.route) &&
      (!state.filters.date || t.date === state.filters.date) &&
      (!query ||
        `${t.bus_name} ${t.code} ${t.origin} ${t.destination}`
          .toLowerCase()
          .includes(query)),
  );
  const results = $("#tripResults");
  if (!results) return;
  $("#tripCount").textContent = `${matches.length} jadwal ditemukan`;
  results.innerHTML = matches.length
    ? matches.map((t) => renderTripCard(t)).join("")
    : empty(
        "calendar",
        "Jadwal tidak ditemukan",
        "Coba ganti tanggal atau rute untuk melihat perjalanan lain.",
      );
  const select = $("#filterRoute");
  if (select) select.value = state.filters.route;
}
function empty(ic, title, desc, button = "") {
  return `<div class="empty-state">${I(ic, "ic-lg")}<h3>${title}</h3><p>${desc}</p>${button}</div>`;
}
function bookingOrders() {
  const isAdmin = state.user.role === "admin";
  const search = state.orderSearch.toLowerCase();
  const bookings = state.bookings.filter((b) => {
    const kind =
      state.orderFilter === "all" ||
      (state.orderFilter === "active"
        ? b.status === "confirmed" &&
          b.trip_status === "active" &&
          tripFuture(b)
        : state.orderFilter === "cancelled"
          ? b.status === "cancelled" || b.trip_status === "cancelled"
          : b.status === "confirmed" && !tripFuture(b));
    return (
      kind &&
      (!search ||
        `${b.code} ${b.student_name} ${b.student_nim} ${b.origin} ${b.destination}`
          .toLowerCase()
          .includes(search))
    );
  });
  return `${heading(isAdmin ? "Data pesanan" : "Pesanan saya", isAdmin ? "Kelola semua tiket yang dipesan mahasiswa." : "Lihat tiket aktif, riwayat, dan detail perjalananmu.", isAdmin ? "" : `<button class="btn btn-primary" data-action="nav" data-page="trips">${I("plus", "ic-sm")} Pesan baru</button>`)}
  <div class="orders-toolbar"><div class="segment">${[
    ["all", "Semua"],
    ["active", "Aktif"],
    ["past", "Selesai"],
    ["cancelled", "Dibatalkan"],
  ]
    .map(
      ([k, v]) =>
        `<button data-action="order-filter" data-filter="${k}" class="${state.orderFilter === k ? "active" : ""}">${v}</button>`,
    )
    .join(
      "",
    )}</div><input class="filter-input" style="max-width:260px" id="orderSearch" placeholder="Cari kode tiket / mahasiswa" value="${esc(state.orderSearch)}" aria-label="Cari pesanan" /></div>
  ${isAdmin ? `<div class="card table-wrap"><table class="data-table"><thead><tr><th>Kode tiket</th><th>Mahasiswa</th><th>Perjalanan</th><th>Kursi</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="ordersResult">${renderAdminOrders(bookings)}</tbody></table></div>` : `<div class="order-list" id="ordersResult">${renderStudentOrders(bookings)}</div>`}`;
}
function renderStudentOrders(items) {
  return items.length
    ? items
        .map(
          (b) =>
            `<div class="order-card"><div class="order-head"><span class="order-code">${I("ticket", "ic-sm")} ${esc(b.code)}</span>${statusTag(b.status)}</div><div class="order-body"><div><h3>${esc(b.origin)} ${I("arrowRight", "ic-sm")} ${esc(b.destination)}</h3><p>${I("calendar", "ic-sm")} ${esc(dateFull(b.date))} · ${esc(b.departure_time)} WIB</p><p>${I("bus", "ic-sm")} ${esc(b.bus_name)} · Kursi ${b.seat_number}</p></div><span class="badge ${b.status === "confirmed" && tripFuture(b) ? "green" : "grey"}">${b.status === "confirmed" && tripFuture(b) ? "Mendatang" : "Riwayat"}</span></div><div class="order-actions"><button class="btn btn-secondary btn-sm" data-action="ticket-detail" data-id="${b.id}">${I("eye", "ic-sm")} Lihat e-ticket</button>${b.status === "confirmed" && b.trip_status === "active" && tripFuture(b) ? `<button class="btn btn-danger btn-sm" data-action="cancel-booking" data-id="${b.id}">Batalkan</button>` : ""}</div></div>`,
        )
        .join("")
    : empty(
        "ticket",
        "Belum ada pesanan",
        "Belum ada tiket pada kategori ini.",
        `<button class="btn btn-primary btn-sm" data-action="nav" data-page="trips">Cari tiket ${I("arrowRight", "ic-sm")}</button>`,
      );
}
function renderAdminOrders(items) {
  return items.length
    ? items
        .map(
          (b) =>
            `<tr><td><strong>${esc(b.code)}</strong><div class="sub">${esc(dateShort(b.created_at.slice(0, 10)))}</div></td><td><strong>${esc(b.student_name)}</strong><div class="sub">${esc(b.student_nim)}</div></td><td><strong>${esc(b.origin)} → ${esc(b.destination)}</strong><div class="sub">${esc(dateShort(b.date))} · ${esc(b.departure_time)}</div></td><td><strong>${b.seat_number}</strong></td><td>${statusTag(b.status)}</td><td><button class="btn btn-secondary btn-sm" data-action="ticket-detail" data-id="${b.id}">Detail</button></td></tr>`,
        )
        .join("")
    : `<tr><td colspan="6">Belum ada pesanan pada kategori ini.</td></tr>`;
}
function schedulesPage() {
  const upcoming = state.trips.filter(
    (t) => t.status === "active" && tripFuture(t),
  ).length;
  return `${heading("Manajemen jadwal bus", "Tambah, ubah, dan batalkan keberangkatan bus kampus.", `<button class="btn btn-primary" data-action="new-trip">${I("plus", "ic-sm")} Tambah jadwal</button>`)}<div class="stat-grid">${metric("Semua jadwal", state.trips.length, "calendar", "Termasuk arsip")}${metric("Jadwal mendatang", upcoming, "bus", "Status aktif")}${metric(
    "Total kapasitas",
    state.trips
      .filter((t) => t.status === "active" && tripFuture(t))
      .reduce((n, t) => n + t.capacity, 0),
    "users",
    "Kursi pada jadwal aktif",
  )}</div><div class="card"><div class="table-title"><div><h2>Daftar jadwal perjalanan</h2><p class="small muted" style="margin-top:5px">Semua jadwal dalam database demo</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Tanggal / Jam</th><th>Rute</th><th>Armada</th><th>Kapasitas</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${state.trips.length ? state.trips.map((t) => `<tr><td><strong>${esc(dateShort(t.date))}</strong><div class="sub">${esc(t.departure_time)} – ${esc(t.arrival_time)} WIB</div></td><td><strong>${esc(t.origin)} → ${esc(t.destination)}</strong><div class="sub">${esc(t.code)}</div></td><td><strong>${esc(t.bus_name)}</strong><div class="sub">${esc(t.plate)}</div></td><td><div class="occupancy"><div class="progress"><i style="width:${Math.round((t.booked_count / t.capacity) * 100)}%"></i></div><small>${t.booked_count}/${t.capacity}</small></div></td><td>${statusTag(t.status)}</td><td><div class="row" style="gap:6px"><button class="btn btn-secondary btn-sm" data-action="edit-trip" data-id="${t.id}" ${t.status === "cancelled" || !tripFuture(t) ? "disabled" : ""}>${I("edit", "ic-sm")}</button><button class="btn btn-danger btn-sm" data-action="cancel-trip" data-id="${t.id}" ${t.status === "cancelled" || !tripFuture(t) ? "disabled" : ""}>${I("x", "ic-sm")}</button></div></td></tr>`).join("") : `<tr><td colspan="6">Belum ada jadwal.</td></tr>`}</tbody></table></div></div>`;
}
function studentsPage() {
  return `${heading("Data mahasiswa", "Daftar akun mahasiswa yang sudah terdaftar pada portal.")}
  <div class="card"><div class="table-title"><h2>${state.studentList.length} mahasiswa terdaftar</h2></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Nama</th><th>NIM</th><th>Email</th><th>Fakultas</th><th>Nomor telepon</th></tr></thead><tbody>${state.studentList.length ? state.studentList.map((u) => `<tr><td><strong>${esc(u.name)}</strong></td><td>${esc(u.nim)}</td><td>${esc(u.email)}</td><td>${esc(u.faculty || "—")}</td><td>${esc(u.phone || "—")}</td></tr>`).join("") : `<tr><td colspan="5">Belum ada mahasiswa.</td></tr>`}</tbody></table></div></div>`;
}
function chatPage() {
  const admin = state.user.role === "admin";
  const contact = admin
    ? state.conversations.find((x) => x.id === state.activeConversation)
    : null;
  return `${heading("Chat bantuan", admin ? "Balas pertanyaan mahasiswa seputar perjalanan dan tiket." : "Ada pertanyaan? Hubungi admin transportasi langsung di sini.")}
    <div class="card chat-card"><aside class="chat-list"><div class="chat-list-head"><h3>${admin ? "Percakapan mahasiswa" : "Pusat bantuan"}</h3><p>${admin ? "Pilih mahasiswa untuk membalas" : "Tim admin transportasi kampus"}</p></div>${admin ? (state.conversations.length ? state.conversations.map((u) => `<button class="chat-contact ${u.id === state.activeConversation ? "selected" : ""}" data-action="chat-select" data-id="${u.id}"><div class="avatar">${esc(initials(u.name))}</div><div style="min-width:0"><strong>${esc(u.name)}</strong><p>${esc(u.last_message || u.nim || "Belum ada pesan")}</p></div></button>`).join("") : `<p class="muted small" style="padding:16px">Belum ada akun mahasiswa.</p>`) : `<div class="chat-contact selected"><div class="avatar yellow">AT</div><div><strong>Admin Transportasi</strong><p>Bantuan jadwal & tiket</p></div></div>`}</aside>
    <div class="chat-conversation"><div class="chat-header"><div class="avatar ${admin ? "" : "yellow"}">${esc(admin ? initials(contact?.name || "M") : "AT")}</div><div><strong>${esc(admin ? contact?.name || "Pilih mahasiswa" : "Admin Transportasi")}</strong><small>${admin ? esc(contact?.nim || "Pilih percakapan untuk mulai") : "Layanan informasi · Demo"}</small></div></div><div class="chat-messages">${renderMessages()}</div><form id="chatForm" class="chat-compose"><input name="body" maxlength="1000" required ${state.activeConversation ? "" : "disabled"} placeholder="Ketik pesan kamu di sini..." autocomplete="off" aria-label="Tulis pesan"/><button type="submit" class="btn btn-primary" ${state.activeConversation ? "" : "disabled"} aria-label="Kirim pesan">${I("send", "ic-sm")} <span class="hide-mobile">Kirim</span></button></form></div></div>`;
}
function renderMessages() {
  return state.messages.length
    ? state.messages
        .map(
          (m) =>
            `<div class="message ${m.sender_id === state.user.id ? "own" : ""}"><div class="message-bubble">${esc(m.body)}</div><small>${esc(m.sender_name)} · ${esc(timeWIB(m.created_at))} WIB</small></div>`,
        )
        .join("")
    : `<div class="chat-intro">${I("chat", "ic-lg")}<h3>Mulai percakapan</h3><p>${state.user.role === "admin" ? "Belum ada pesan pada percakapan ini." : "Tanyakan informasi jadwal, kursi, atau pemesanan kepada admin."}</p></div>`;
}
function scrollChat() {
  const node = $(".chat-messages");
  if (node) node.scrollTop = node.scrollHeight;
}
function profilePage() {
  const u = state.user;
  return `${heading("Profil akun", "Kelola informasi pribadi dan keamanan akunmu.")}
  <div class="profile-grid"><div class="card card-pad"><div class="profile-top"><div class="avatar ${u.role === "admin" ? "yellow" : ""}">${esc(initials(u.name))}</div><div><h3>${esc(u.name)}</h3><p>${esc(u.email)} · ${roleName(u.role)}</p></div></div><div class="panel-header"><h2>Informasi pribadi</h2></div><form id="profileForm"><div class="form-grid"><div class="field"><label>Nama lengkap</label><input name="name" value="${esc(u.name)}" required minlength="3" maxlength="80" /></div><div class="field"><label>${u.role === "admin" ? "Jenis akun" : "Nomor Induk Mahasiswa"}</label><input value="${esc(u.role === "admin" ? "Administrator" : u.nim)}" disabled /></div><div class="field"><label>Email terdaftar</label><input value="${esc(u.email)}" disabled /></div><div class="field"><label>Nomor telepon</label><input name="phone" value="${esc(u.phone || "")}" maxlength="25" placeholder="Contoh: 081234567890" /></div><div class="field" style="grid-column:1/-1"><label>Fakultas / Unit kerja</label><input name="faculty" value="${esc(u.faculty || "")}" maxlength="100" placeholder="Contoh: Fakultas Ilmu Komputer" /></div></div><button class="btn btn-primary" type="submit">${I("check", "ic-sm")} Simpan perubahan</button></form></div>
  <div class="stack" style="gap:20px"><div class="card card-pad"><div class="panel-header"><div><h2>Keamanan akun</h2><p>Perbarui kata sandi secara berkala.</p></div>${I("lock")}</div><form id="passwordForm"><div class="field"><label>Kata sandi saat ini</label><input type="password" name="current_password" required placeholder="Kata sandi saat ini" /></div><div class="field"><label>Kata sandi baru</label><input type="password" name="new_password" required minlength="8" placeholder="Minimal 8 karakter" /></div><button type="submit" class="btn btn-secondary btn-block">Ubah kata sandi</button></form></div><div class="notice-card">${I("shield", "ic-lg")}<h3>Privasi dan keamanan</h3><p>Akun mahasiswa hanya dapat melihat tiket dan percakapan miliknya sendiri. Fitur admin memerlukan hak akses khusus dari server.</p></div></div></div>`;
}
const views = {
  dashboard: () =>
    state.user.role === "admin" ? adminDashboard() : studentDashboard(),
  trips: tripsPage,
  schedules: schedulesPage,
  orders: bookingOrders,
  chat: chatPage,
  profile: profilePage,
  students: studentsPage,
};
function showModal(inner, cls = "") {
  let root = $("#modal-root");
  if (!root) return;
  root.innerHTML = `<div class="modal-overlay" data-overlay="true"><div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="Dialog aplikasi">${inner}</div></div>`;
  document.body.style.overflow = "hidden";
}
function closeModal() {
  const root = $("#modal-root");
  if (root) root.innerHTML = "";
  document.body.style.overflow = "";
  state.selectedTrip = null;
  state.seat = null;
}
const modalHead = (title, sub = "") =>
  `<div class="modal-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div><button class="icon-button" data-action="modal-close" aria-label="Tutup dialog">${I("x")}</button></div>`;
async function openBooking(id) {
  try {
    const data = await api(`/api/trips/${id}/seats`);
    if (!tripFuture(data.trip) || data.trip.status !== "active")
      return toast("Jadwal tidak lagi tersedia.", true);
    state.selectedTrip = data.trip;
    state.occupied = data.occupied;
    state.seat = null;
    bookingModal();
  } catch (e) {
    toast(e.message, true);
  }
}
function bookingModal() {
  const t = state.selectedTrip;
  if (!t) return;
  const rows = [];
  for (let r = 0; r < Math.ceil(t.capacity / 4); r++) {
    const seats = [];
    for (let x = 1; x <= 4; x++) {
      if (x === 3) seats.push('<span class="seat-gap"></span>');
      const s = r * 4 + x;
      if (s > t.capacity) {
        seats.push("<span></span>");
        continue;
      }
      const booked = state.occupied.includes(s);
      seats.push(
        `<button type="button" class="seat ${booked ? "taken" : state.seat === s ? "selected" : ""}" data-action="seat-select" data-seat="${s}" ${booked ? 'disabled aria-label="Kursi ' + s + ' terisi"' : `aria-pressed="${state.seat === s}" aria-label="Pilih kursi ${s}"`}>${String(s).padStart(2, "0")}</button>`,
      );
    }
    rows.push(`<div class="seat-row">${seats.join("")}</div>`);
  }
  showModal(
    `${modalHead("Pilih kursi perjalanan", "Pilih kursi yang tersedia, lalu konfirmasi pemesananmu.")}
  <div class="modal-body"><div class="stepbar"><span class="step-active"><b>1</b> Jadwal</span><i></i><span class="step-active"><b>2</b> Pilih kursi</span><i></i><span><b>3</b> Konfirmasi</span></div><div class="booking-grid"><div class="seat-selection"><h3 style="font-size:14px">Denah kursi bus</h3><div class="seat-legend"><span><i class="seat-dot"></i> Tersedia</span><span><i class="seat-dot selected"></i> Pilihanmu</span><span><i class="seat-dot taken"></i> Terisi</span></div><div class="seat-map"><div class="seat-driver">${I("steering", "ic-lg")} <span class="tiny" style="margin-left:6px">Sopir</span></div>${rows.join("")}</div></div>
  <div class="booking-summary"><h3>Ringkasan perjalanan</h3><div class="summary-item"><span>Rute</span><strong>${esc(t.origin)} → ${esc(t.destination)}</strong></div><div class="summary-item"><span>Hari & tanggal</span><strong>${esc(dateShort(t.date))}</strong></div><div class="summary-item"><span>Waktu</span><strong>${esc(t.departure_time)} WIB</strong></div><div class="summary-item"><span>Bus</span><strong>${esc(t.bus_name)}</strong></div><div class="summary-item"><span>No. kursi</span><strong id="chosenSeat" style="color:var(--green)">${state.seat || "Belum dipilih"}</strong></div><div class="summary-item"><span>Biaya</span><strong>${rupiah(t.price)}</strong></div><p class="tiny muted" style="margin-top:13px">Pastikan data perjalanan sesuai. Satu mahasiswa hanya bisa memiliki satu tiket aktif untuk jadwal yang sama.</p></div></div></div>
  <div class="modal-foot"><button class="btn btn-secondary" data-action="modal-close">Kembali</button><button class="btn btn-primary" id="confirmSeat" data-action="confirm-booking" ${state.seat ? "" : "disabled"}>Konfirmasi pesanan ${I("arrowRight", "ic-sm")}</button></div>`,
    "wide",
  );
}
function ticketModal(b, success = false) {
  const isCancelled = b.status === "cancelled";
  showModal(`${modalHead(success ? "Pemesanan berhasil!" : "Detail e-ticket", success ? "Tiketmu sudah tersimpan. Selamat bepergian!" : "Tunjukkan kode tiket saat verifikasi keberangkatan.")}
  <div class="modal-body">${success ? `<div style="text-align:center;color:var(--green);margin:0 0 17px">${I("checkCircle", "ic-xl")} <strong style="font-size:14px">Kursi berhasil dipesan</strong></div>` : ""}
  <div class="success-ticket"><div class="success-top"><div class="row between" style="margin-bottom:20px"><span class="small">UNSRI BUS · E-TICKET</span><span class="badge" style="background:#ffffff22;color:#fff">${isCancelled ? "Dibatalkan" : "Terkonfirmasi"}</span></div><h3>${esc(b.origin)} → ${esc(b.destination)}</h3><p>${esc(b.bus_name)} · ${esc(b.plate)}</p></div><div class="success-bottom"><div class="ticket-field"><span>Nama penumpang</span><strong>${esc(b.student_name)}</strong></div><div class="ticket-field"><span>NIM</span><strong>${esc(b.student_nim || "—")}</strong></div><div class="ticket-field"><span>Tanggal</span><strong>${esc(dateFull(b.date))}</strong></div><div class="ticket-field"><span>Berangkat</span><strong>${esc(b.departure_time)} WIB</strong></div><div class="ticket-field"><span>No. kursi</span><strong style="color:var(--green);font-size:19px">${b.seat_number}</strong></div><div class="ticket-field"><span>Tarif</span><strong>${rupiah(b.price)}</strong></div></div><div class="codebar">${esc(b.code)}</div></div><p class="small muted" style="margin-top:12px;text-align:center">*Tiket merupakan bagian dari prototipe demo, bukan tiket perjalanan resmi.</p></div>
  <div class="modal-foot"><button class="btn btn-secondary" data-action="modal-close">Tutup</button><button class="btn btn-primary" data-action="print-ticket" ${isCancelled ? "disabled" : ""}>${I("download", "ic-sm")} Cetak / Simpan PDF</button></div>`);
}
function confirmModal({ title, body, action, id, confirm = "Ya, lanjutkan" }) {
  showModal(
    `${modalHead(title)}<div class="modal-body"><p class="danger-copy">${body}</p></div><div class="modal-foot"><button class="btn btn-secondary" data-action="modal-close">Tidak, kembali</button><button class="btn btn-danger" data-action="${action}" data-id="${id}">${confirm}</button></div>`,
    "small-modal",
  );
}
function scheduleModal(trip = null) {
  const t = trip || {
    origin: "Palembang",
    destination: "Indralaya",
    date: "",
    departure_time: "07:00",
    arrival_time: "08:15",
    bus_name: "Bus Sriwijaya",
    plate: "BG 0000 UN",
    capacity: 32,
    price: 0,
  };
  const today = nowLocal().slice(0, 10);
  showModal(`${modalHead(trip ? "Ubah jadwal bus" : "Tambah jadwal baru", trip ? "Perbarui informasi perjalanan yang sudah ada." : "Isi detail keberangkatan dan armada.")}
  <div class="modal-body"><form id="scheduleForm" data-id="${trip?.id || ""}"><div class="form-grid"><div class="field"><label>Asal keberangkatan</label><select name="origin" required><option ${t.origin === "Palembang" ? "selected" : ""}>Palembang</option><option ${t.origin === "Indralaya" ? "selected" : ""}>Indralaya</option></select></div><div class="field"><label>Tujuan</label><select name="destination" required><option ${t.destination === "Indralaya" ? "selected" : ""}>Indralaya</option><option ${t.destination === "Palembang" ? "selected" : ""}>Palembang</option></select></div><div class="field"><label>Tanggal berangkat</label><input type="date" name="date" min="${today}" value="${esc(t.date)}" required /></div><div class="field"><label>Nama bus / armada</label><input name="bus_name" value="${esc(t.bus_name)}" maxlength="70" required /></div><div class="field"><label>Jam berangkat (WIB)</label><input type="time" name="departure_time" value="${esc(t.departure_time)}" required /></div><div class="field"><label>Jam tiba (WIB)</label><input type="time" name="arrival_time" value="${esc(t.arrival_time)}" required /></div><div class="field"><label>Plat nomor</label><input name="plate" value="${esc(t.plate)}" required /></div><div class="field"><label>Jumlah kursi (4–60)</label><input type="number" name="capacity" min="4" max="60" value="${t.capacity}" required /></div><div class="field"><label>Tarif / tiket (Rp)</label><input type="number" name="price" min="0" step="1000" value="${t.price}" required /></div></div><p class="small muted">Catatan: gunakan Rp0 bila bus gratis pada skenario pengujian.</p></form></div><div class="modal-foot"><button class="btn btn-secondary" data-action="modal-close">Batal</button><button class="btn btn-primary" type="submit" form="scheduleForm">${I("check", "ic-sm")} ${trip ? "Simpan perubahan" : "Tambahkan jadwal"}</button></div>`);
}
async function reloadOrders() {
  state.bookings = await api("/api/bookings");
  renderApp();
}
async function reloadTrips() {
  state.trips = await api("/api/trips");
  renderApp();
  if (state.page === "trips") updateTripResults();
}

el.addEventListener("click", async (e) => {
  if (e.target.matches("[data-overlay]")) {
    closeModal();
    return;
  }
  const button = e.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const a = button.dataset.action,
    id = Number(button.dataset.id);
  try {
    if (a === "auth-login") return showAuth("login");
    if (a === "auth-register") return showAuth("register");
    if (a === "landing") return showLanding();
    if (a === "nav") return navigate(button.dataset.page);
    if (a === "sidebar-open") {
      state.sidebar = true;
      return renderApp();
    }
    if (a === "sidebar-close") {
      state.sidebar = false;
      return renderApp();
    }
    if (a === "logout") {
      await post("/api/auth/logout", {});
      state.user = null;
      state.stats = null;
      state.trips = [];
      stopPoll();
      showLanding();
      try {
        state.trips = await api("/api/public/trips");
        renderLanding();
      } catch {}
      toast("Anda telah keluar.");
      return;
    }
    if (a === "modal-close") return closeModal();
    if (a === "toggle-password") {
      const input = document.getElementById(button.dataset.target);
      input.type = input.type === "password" ? "text" : "password";
      button.innerHTML = I(input.type === "password" ? "eye" : "eyeOff");
      return;
    }
    if (a === "book-trip") return openBooking(id);
    if (a === "seat-select") {
      state.seat = Number(button.dataset.seat);
      $$(".seat").forEach((b) => {
        b.classList.toggle("selected", Number(b.dataset.seat) === state.seat);
        b.setAttribute(
          "aria-pressed",
          String(Number(b.dataset.seat) === state.seat),
        );
      });
      $("#chosenSeat").textContent = state.seat;
      $("#confirmSeat").disabled = false;
      return;
    }
    if (a === "confirm-booking") {
      if (!state.selectedTrip || !state.seat)
        return toast("Pilih satu kursi terlebih dahulu.", true);
      button.disabled = true;
      button.innerHTML = `<span class="loader" style="width:15px;height:15px;border-width:2px"></span> Memesan...`;
      try {
        const ticket = await post("/api/bookings", {
          trip_id: state.selectedTrip.id,
          seat_number: state.seat,
        });
        ticketModal(ticket, true);
        toast("Tiket berhasil dipesan!");
      } catch (err) {
        toast(err.message, true);
        await openBooking(state.selectedTrip.id);
      }
      return;
    }
    if (a === "ticket-detail") {
      let b = state.bookings.find((b) => b.id === id) || state.stats?.upcoming;
      if (b?.id !== id) {
        const fetched = await api("/api/bookings");
        b = fetched.find((x) => x.id === id);
      }
      if (b) return ticketModal(b);
      return toast("Tiket tidak ditemukan.", true);
    }
    if (a === "print-ticket") return window.print();
    if (a === "cancel-booking")
      return confirmModal({
        title: "Batalkan tiket ini?",
        body: "Tiket yang dibatalkan tidak dapat digunakan kembali. Kursi akan tersedia untuk mahasiswa lain.",
        action: "confirm-cancel-booking",
        id,
        confirm: "Ya, batalkan tiket",
      });
    if (a === "confirm-cancel-booking") {
      await post(`/api/bookings/${id}/cancel`, {});
      closeModal();
      await reloadOrders();
      toast("Tiket berhasil dibatalkan.");
      return;
    }
    if (a === "order-filter") {
      state.orderFilter = button.dataset.filter;
      renderApp();
      return;
    }
    if (a === "reset-filters") {
      state.filters = { route: "all", date: "", search: "" };
      renderApp();
      updateTripResults();
      return;
    }
    if (a === "refresh-trips") {
      await reloadTrips();
      toast("Jadwal berhasil diperbarui.");
      return;
    }
    if (a === "new-trip") return scheduleModal();
    if (a === "edit-trip")
      return scheduleModal(state.trips.find((t) => t.id === id));
    if (a === "cancel-trip")
      return confirmModal({
        title: "Batalkan jadwal bus?",
        body: "Jadwal bus ini akan dibatalkan. Semua tiket aktif pada jadwal ini juga otomatis dibatalkan. Tindakan tidak dapat dibatalkan.",
        action: "confirm-cancel-trip",
        id,
        confirm: "Batalkan jadwal",
      });
    if (a === "confirm-cancel-trip") {
      await patch(`/api/admin/trips/${id}`, { status: "cancelled" });
      closeModal();
      await reloadTrips();
      toast("Jadwal dan tiket terkait telah dibatalkan.");
      return;
    }
    if (a === "chat-select") {
      state.activeConversation = id;
      state.messages = await api(`/api/chat/${id}`);
      renderApp();
      scrollChat();
      return;
    }
  } catch (err) {
    toast(err.message, true);
  }
});
el.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const submit =
    form.querySelector('button[type="submit"]') ||
    document.querySelector(`[form="${form.id}"][type="submit"]`);
  if (submit) submit.disabled = true;
  try {
    if (form.id === "authForm") {
      if (state.authMode === "register") {
        await post("/api/auth/register", data);
        showAuth("login");
        toast("Pendaftaran berhasil! Silakan masuk menggunakan akunmu.");
      } else {
        const u = await post("/api/auth/login", data);
        state.user = u;
        state.screen = "app";
        toast(`Selamat datang, ${u.name.split(" ")[0]}!`);
        await navigate("dashboard");
      }
    } else if (form.id === "profileForm") {
      state.user = await patch("/api/profile", data);
      renderApp();
      toast("Profil berhasil diperbarui.");
    } else if (form.id === "passwordForm") {
      await post("/api/profile/password", data);
      form.reset();
      toast("Kata sandi berhasil diperbarui.");
    } else if (form.id === "scheduleForm") {
      if (data.origin === data.destination)
        throw Error("Asal dan tujuan harus berbeda.");
      const id = form.dataset.id;
      if (id) await patch(`/api/admin/trips/${id}`, data);
      else await post("/api/admin/trips", data);
      closeModal();
      await reloadTrips();
      toast(
        id ? "Jadwal berhasil diubah." : "Jadwal baru berhasil ditambahkan.",
      );
    } else if (form.id === "chatForm") {
      const body = String(data.body || "").trim();
      if (!body) return;
      await post(`/api/chat/${state.activeConversation}`, { body });
      form.reset();
      state.messages = await api(`/api/chat/${state.activeConversation}`);
      const box = $(".chat-messages");
      if (box) {
        box.innerHTML = renderMessages();
        scrollChat();
      }
      if (state.user.role === "admin")
        state.conversations = await api("/api/chat/conversations");
    }
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (submit && submit.isConnected) submit.disabled = false;
  }
});
el.addEventListener("input", (e) => {
  if (e.target.dataset.filter) {
    state.filters[e.target.dataset.filter] = e.target.value;
    updateTripResults();
  }
  if (e.target.id === "orderSearch") {
    state.orderSearch = e.target.value;
    const filtered = state.bookings.filter((b) => {
      const kind =
        state.orderFilter === "all" ||
        (state.orderFilter === "active"
          ? b.status === "confirmed" &&
            b.trip_status === "active" &&
            tripFuture(b)
          : state.orderFilter === "cancelled"
            ? b.status === "cancelled" || b.trip_status === "cancelled"
            : b.status === "confirmed" && !tripFuture(b));
      return (
        kind &&
        `${b.code} ${b.student_name} ${b.student_nim} ${b.origin} ${b.destination}`
          .toLowerCase()
          .includes(state.orderSearch.toLowerCase())
      );
    });
    const container = $("#ordersResult");
    if (container)
      container.innerHTML =
        state.user.role === "admin"
          ? renderAdminOrders(filtered)
          : renderStudentOrders(filtered);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
(async function start() {
  try {
    state.user = await api("/api/auth/me");
    state.screen = "app";
    await navigate("dashboard");
  } catch {
    state.screen = "landing";
    try {
      state.trips = await api("/api/public/trips");
    } catch {}
    renderLanding();
  }
})();
