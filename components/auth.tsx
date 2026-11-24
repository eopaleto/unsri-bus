"use client";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BusFront,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { BusIllustration } from "./illustration";
import { AcademicFields } from "./academic-fields";
export function Brand() {
  return (
    <a className="brand" href="/" aria-label="UNSRI Bus beranda">
      <BusFront />
      <span>
        UNSRI <b>Bus</b>
      </span>
    </a>
  );
}
export async function request<T>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Permintaan gagal. Coba lagi.");
  return result.data;
}
export function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <nav>
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#tentang">Tentang layanan</a>
        </nav>
        <a className="button primary" href="/login">
          Masuk <ArrowRight size={16} />
        </a>
      </header>
      <main>
        <section className="landing-hero">
          <div>
            <span className="eyebrow">PERJALANAN KAMPUS, LEBIH SEDERHANA</span>
            <h1>
              Ke Kampus
              <br />
              Tanpa Ribet?
            </h1>
            <p>
              Cari jadwal, pilih kursi, dan simpan tiketmu.
              <br />
              Satu tempat untuk setiap perjalanan bersama UNSRI Bus.
            </p>
            <div className="button-row">
              <a href="/register" className="button primary">
                Mulai perjalanan <ArrowRight size={18} />
              </a>
            </div>
          </div>
          <div className="landing-art">
            <div className="art-label">
              <span className="status-dot" /> Perjalanan yang lebih terencana
            </div>
            <BusIllustration />
            <div className="art-ticket">
              <Ticket />
              <div>
                <strong>Kursimu, sudah siap.</strong>
                <span>Tiket digital dalam genggaman.</span>
              </div>
              <Check />
            </div>
          </div>
        </section>
        <section id="cara-kerja" className="how-grid">
          {[
            [
              CalendarDays,
              "01",
              "Temukan jadwal",
              "Pilih rute dan waktu yang sesuai dengan kegiatanmu.",
            ],
            [
              BusFront,
              "02",
              "Pilih kursimu",
              "Tentukan halte dan kursi favorit sebelum berangkat.",
            ],
            [
              Ticket,
              "03",
              "Siap berangkat",
              "Tunjukkan tiket digital saat menaiki bus.",
            ],
          ].map(([Icon, n, title, copy]) => {
            const C = Icon as typeof Ticket;
            return (
              <article key={String(n)}>
                <span className="how-number">{String(n)}</span>
                <C />
                <h2>{String(title)}</h2>
                <p>{String(copy)}</p>
              </article>
            );
          })}
        </section>
        <div id="tentang" className="landing-disclaimer">
          <strong>Dibuat untuk perjalanan mahasiswa yang lebih baik.</strong>
          <p>
            UNSRI Bus adalah Aplikasi transportasi kampus yang dikembangkan secara independen. Ini bukan layanan resmi atau sistem pembayaran Universitas Sriwijaya. Semua informasi dan jadwal bus disediakan untuk tujuan prototipe dan pengalaman pengguna.
          </p>
        </div>
      </main>
      <footer className="landing-footer">
        <Brand />
        <span>Perjalanan kecil. Kesempatan besar.</span>
        <small>© {new Date().getFullYear()} UNSRI Bus All Rights Reserved</small>
      </footer>
    </div>
  );
}
export function Auth({
  mode,
  configured,
}: {
  mode: string;
  configured: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [visible, setVisible] = useState(false);
  const register = mode === "register",
    forgot = mode === "forgot-password",
    reset = mode === "reset-password";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if ((register || reset) && data.password !== data.confirm)
        throw Error("Konfirmasi kata sandi belum sama.");
      if (register) {
        await request("auth/register", {
          full_name: data.full_name,
          nim: data.nim,
          email: data.email,
          password: data.password,
          faculty: data.faculty || "",
          program: data.program || "",
          consent: data.consent === "on",
        });
        window.location.assign("/dashboard");
      } else if (forgot) {
        await request("auth/recover", { email: data.email });
        setSuccess(
          "Jika akun tersedia, tautan pemulihan telah dikirim. Periksa email Anda.",
        );
      } else if (reset) {
        await request("auth/reset", { password: data.password });
        window.location.assign("/dashboard");
      } else {
        await request("auth/login", {
          email: data.email,
          password: data.password,
        });
        const profile = await request<{ role: string }>("auth/me");
        window.location.assign(
          profile.role === "admin" ? "/admin" : "/dashboard",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">BERSAMA, SAMPAI TUJUAN.</span>
          <h1>
            Satu perjalanan.
            <br />
            Banyak cerita.
          </h1>
          <p>Mulai harimu dengan perjalanan yang nyaman dan lebih terencana.</p>
          <BusIllustration />
        </div>
        <small>© {new Date().getFullYear()} UNSRI Bus All Rights Reserved</small>
      </aside>
      <main className="auth-form-area">
        <a className="back-link" href="/">
          <ArrowLeft size={16} /> Kembali ke beranda
        </a>
        <div className="auth-form">
          <span className="eyebrow">SELAMAT DATANG DI UNSRI BUS</span>
          <h1>
            {register
              ? "Buat akun mahasiswa"
              : forgot
                ? "Lupa kata sandi?"
                : reset
                  ? "Atur kata sandi baru"
                  : "Senang bertemu lagi."}
          </h1>
          <p>
            {register
              ? "Lengkapi identitasmu untuk memulai perjalanan."
              : forgot
                ? "Kami akan mengirim tautan pemulihan ke emailmu."
                : reset
                  ? "Pilih kata sandi baru dengan minimal 8 karakter."
                  : "Masuk untuk mengatur perjalanan kampusmu."}
          </p>
          {!configured && (
            <div className="notice">
              Supabase belum terhubung. <a href="/demo">Buka pratinjau demo</a>{" "}
              untuk mencoba tampilan.
            </div>
          )}
          <form onSubmit={submit}>
            {register && (
              <>
                <label>
                  Nama lengkap
                  <input
                    name="full_name"
                    minLength={3}
                    maxLength={80}
                    required
                    autoComplete="name"
                    placeholder="Nama lengkap sesuai identitas"
                  />
                </label>
                <label>
                  NIM
                  <input
                    name="nim"
                    pattern="[0-9]{7,20}"
                    inputMode="numeric"
                    required
                    placeholder="Nomor Induk Mahasiswa"
                  />
                </label>
                <div className="form-grid">
                  <AcademicFields />
                </div>
              </>
            )}
            {!reset && (
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="nama@email.com"
                />
              </label>
            )}
            {!forgot && (
              <label>
                Kata sandi
                <div className="password-field">
                  <input
                    name="password"
                    type={visible ? "text" : "password"}
                    minLength={register || reset ? 8 : 1}
                    maxLength={128}
                    required
                    autoComplete={
                      register || reset ? "new-password" : "current-password"
                    }
                    placeholder="Masukkan kata sandi"
                  />
                  <button
                    type="button"
                    aria-label={
                      visible
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            )}
            {(register || reset) && (
              <label>
                Konfirmasi kata sandi
                <input
                  name="confirm"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Konfirmasi kata sandi"
                  autoComplete="new-password"
                />
              </label>
            )}
            {register && (
              <label className="checkbox-label">
                <input type="checkbox" name="consent" required />
                <span>
                  Saya memahami ini adalah seluruh peraturan UNSRI Bus dan saya setuju untuk mematuhi ketentuan yang berlaku.
                </span>
              </label>
            )}
            {!register && !forgot && !reset && (
              <a className="forgot-link" href="/forgot-password">
                Lupa kata sandi?
              </a>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="form-success" role="status">
                {success}
              </p>
            )}
            <button
              className="button primary full"
              disabled={busy || !configured}
            >
              {busy
                ? "Memproses…"
                : register
                  ? "Daftar akun"
                  : forgot
                    ? "Kirim tautan"
                    : reset
                      ? "Simpan kata sandi"
                      : "Masuk ke dashboard"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <a href={register ? "/login" : "/register"}>
              {register ? "Masuk" : "Daftar sekarang"}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
