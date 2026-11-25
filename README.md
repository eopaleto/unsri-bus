# UNSRI Bus — Next.js + Supabase

Reservasi bus kampus berbahasa Indonesia menggunakan **Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Auth, PostgreSQL, dan Realtime**. Dashboard mengikuti referensi desktop/mobile: sidebar, navigasi bawah, kartu tiket hijau, kalender, dan jadwal. Dialog menggunakan primitive Radix dengan pengelolaan fokus dan keyboard.

## Coba tanpa Supabase

Node.js 22.13+ dan npm:

```powershell
npm install
npm run dev
```

Buka [localhost:3000](http://localhost:3000), atau langsung [pratinjau dashboard](http://localhost:3000/demo).

`/demo` menyediakan kalender, filter, kursi, konfirmasi, tiket cetak/PDF, pembatalan, profil, dan chat simulasi. Perubahan hanya berada di memori tab dan hilang setelah reload. Pesan tidak dikirim ke admin. Tiket ditandai **tidak berlaku**. Demo tidak membuat sesi atau melewati otorisasi API.

## Setup Supabase

**Untuk database yang sudah terhubung:** jalankan seluruh isi
[`supabase/UPDATE_UNSRI_BUS.sql`](supabase/UPDATE_UNSRI_BUS.sql) dalam satu query di **Supabase → SQL Editor → New query → Run**, lalu muat ulang aplikasi.
Tidak perlu menjalankan migration awal pada database lama. File pembaruan mempertahankan data, menambahkan kolom kompatibilitas, memasang RPC `unsri_v2_*` beserta kebijakan akses, mengisi katalog akademik, dan menyegarkan schema cache.
File dapat dijalankan kembali; seluruh perubahan dibatalkan otomatis jika ada kegagalan.
Rincian perubahan dan sumber katalog ada di [`docs/UPDATE_20261020.md`](docs/UPDATE_20261020.md).

Jika pembaruan sebelumnya sudah dijalankan tetapi registrasi menampilkan **Database error saving new user**, jalankan
[`supabase/FIX_SIGNUP.sql`](supabase/FIX_SIGNUP.sql) sekali. File ini mengganti trigger profil lama yang tidak memiliki hak menulis ke `public.profiles`.

Jika booking menampilkan `null value in column "price"`, jalankan
[`supabase/FIX_BOOKING.sql`](supabase/FIX_BOOKING.sql) sekali. Harga tiket akan disalin dari `schedules.fare_idr` pada saat booking dibuat.

1. Buat proyek Supabase baru; gunakan proyek pengujian untuk seed.
2. Salin `.env.example` menjadi `.env.local` di root:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Ambil URL dan **publishable key** dari pengaturan API. Tidak diperlukan service-role key. Jangan commit `.env.local`, token, atau database lokal.

3. Jalankan [`supabase/migrations/202610200001_initial.sql`](supabase/migrations/202610200001_initial.sql) di SQL Editor, pada **database baru**. Alternatif dengan Supabase CLI:

   ```powershell
   supabase link --project-ref PROJECT_REF
   supabase db push
   ```

4. Jika memakai SQL Editor, jalankan juga [`supabase/UPDATE_UNSRI_BUS.sql`](supabase/UPDATE_UNSRI_BUS.sql) untuk RPC terbaru dan katalog fakultas/prodi. `supabase db push` menerapkan kedua migrasi otomatis. Opsional: jalankan [`supabase/seed.sql`](supabase/seed.sql) **sekali**, untuk bus, halte, dua rute, dan jadwal tujuh hari mulai besok. Seed tidak membuat akun/kata sandi demo. Menjalankannya lagi menambah jadwal.
5. **Authentication → Providers → Email**: aktifkan email/password dan **nonaktifkan Confirm email**. Akun baru langsung masuk tanpa aktivasi atau persetujuan manual. Tetapkan minimal 8 karakter dan rate limit Auth. SMTP hanya diperlukan untuk fitur pemulihan kata sandi.
6. **Authentication → URL Configuration**: isi Site URL `http://localhost:3000` dan izinkan:

   ```text
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/callback?next=/reset-password
   ```

7. Gunakan tautan berikut dalam template **Reset password**:

   ```text
   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
   ```

   Callback juga mendukung pertukaran `code` PKCE untuk template default Supabase.

8. Restart `npm run dev`. Daftar di `/register` untuk langsung membuka dashboard. Akun yang sudah ada cukup login.

Skema profil lama yang belum memiliki kolom `status` tetap dapat login. Aplikasi tidak meminta status aktivasi; hanya akun yang secara eksplisit berstatus `suspended` yang ditolak. Pemeriksaan role admin tetap berlaku.

Data SQLite lama tetap di `data/` dan **tidak otomatis diimpor**. Password lama juga tidak dipindahkan ke Supabase Auth. Antarmuka lama diarsipkan dalam `legacy/public/`, dokumentasinya di [`docs/LEGACY_SQLITE.md`](docs/LEGACY_SQLITE.md). `npm run legacy` menjalankan server lama secara terpisah.

## Admin pertama

Daftar akun dahulu. Jalankan di SQL Editor dengan UUID akun yang benar:

```sql
begin;
update public.profiles
set role = 'admin'
where id = 'UUID_AKUN_ADMIN'::uuid;

insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
values (
  'UUID_AKUN_ADMIN'::uuid, 'bootstrap_admin', 'profile',
  'UUID_AKUN_ADMIN'::uuid, '{"source":"trusted SQL Editor"}'::jsonb
);
commit;
```

Logout/login; admin diarahkan ke `/admin`. Role tidak dapat dipilih saat registrasi atau diubah di profil.

Urutan konfigurasi: **Halte → Rute beserta urutan halte → Armada → Jadwal**. Kursi bus dan snapshot kursi jadwal dibuat otomatis. Data diarsipkan melalui status nonaktif/pembatalan agar riwayat tiket tetap ada.

## Fitur dan aturan

- Mini sidebar desktop yang dapat diperluas; preferensi tersimpan di browser. Navigasi bawah pada ponsel.
- Pencarian seluruh menu dan fitur sesuai role, dengan Ctrl/Cmd+K, tombol panah, Enter, dan Escape. Filter jadwal tetap terpisah.
- Dropdown akun berisi Profil saya, Pengaturan, dan Logout.
- Fakultas/prodi pada registrasi dan profil berupa dropdown berantai dari Supabase; jika katalog kosong atau gagal dimuat, API memakai snapshot `data/unsri-academics.json` yang disertakan dalam aplikasi. Pasangan fakultas/prodi tetap divalidasi di API dan database. Cadangan katalog tidak menggantikan migrasi database yang diperlukan untuk menyimpan profil.

- Landing; registrasi langsung tanpa aktivasi, login/logout, pemulihan dan penggantian kata sandi.
- Dashboard mahasiswa, tiket terdekat/keadaan kosong, kalender mingguan, status armada berdasarkan database.
- Filter tanggal/rute/waktu/bus/halte; kursi dan halte berurutan; konfirmasi; kode booking; cetak/PDF browser.
- Satu booking aktif per mahasiswa/jadwal. Pemesanan dan pembatalan ditutup 30 menit sebelum keberangkatan.
- Pesanan mendatang/riwayat/dibatalkan, pencarian, detail, pembatalan.
- Chat mahasiswa/admin dengan Supabase Postgres Changes dan RLS; sinkronisasi ulang 15 detik.
- Profil dengan NIM/email read-only; notifikasi booking, pembatalan jadwal, dan balasan admin.
- Admin: ringkasan, kelola bus/rute/halte/jadwal, pesanan, mahasiswa, chat, audit log di database.

Denah kursi disinkronkan setiap 10 detik saat dialog terbuka; konflik konfirmasi tetap diperiksa secara atomik. Tidak ada GPS, payment gateway, SSO/verifikasi resmi mahasiswa, atau QR check-in.

## Integritas dan keamanan

- RLS untuk semua tabel. Sesi server diverifikasi dengan `auth.getUser()`; proxy memperbarui cookie. `/dashboard` dan `/admin` dilindungi server.
- API memakai klien Supabase terikat sesi, tanpa service-role key.
- Trigger Auth selalu membuat mahasiswa; grant update profil dibatasi per kolom.
- Reservasi memakai lock jadwal, dua indeks unik parsial, dan foreign key komposit kursi/jadwal.
- Pembatalan melepas kursi tanpa menghapus transaksi. Pembatalan jadwal dan notifikasi bersifat atomik.
- Jadwal dengan riwayat booking tidak bisa diedit; batalkan dengan alasan dan buat jadwal baru. Snapshot kursi tidak berubah mengikuti bus.
- Admin hanya menulis melalui RPC berotorisasi dengan audit log. Fungsi internal tidak diberikan kepada klien.
- Zod, batas payload, pemeriksaan Origin, `private, no-store`, rate limit database untuk booking/chat, rate limit Auth oleh Supabase.
- Realtime memublikasikan pesan dan notifikasi dengan penyaringan RLS per pengguna.

## Pengujian

```powershell
npm run check
npm run build
npm start
```

`check` menjalankan TypeScript dan Vitest. [`tests/validation.test.ts`](tests/validation.test.ts) menguji role injection, perlindungan identitas, halte, kapasitas, cutoff, status jadwal, dan tanggal WIB.

[`tests/database.test.ts`](tests/database.test.ts) menjalankan migration dan seed **asli** pada PostgreSQL WASM (PGlite + pgcrypto), tanpa memodifikasi RLS/RPC. Harness menyediakan skema Auth dan helper identitas untuk simulasi sesi. Pengujian mencakup akses anonim/antarpengguna, grant role, kursi ganda, satu booking per mahasiswa, pembatalan, cutoff, verifikasi email, isolasi chat, audit, pembatalan jadwal, dan snapshot kursi.

PGlite tidak menggantikan layanan Supabase atau pengujian konkurensi dua koneksi. Setelah Supabase terhubung:

1. Buat dua mahasiswa dan admin, lalu pesan kursi sama dari dua sesi secara bersamaan: satu sukses, satu `409`, hanya satu booking aktif.
2. Uji akses lintas akun melalui API maupun Supabase langsung.
3. Uji registrasi tanpa aktivasi, reset password, login/logout, cookie, dan Realtime pada domain final.
4. Uji CRUD admin, pembatalan dengan notifikasi, serta kehilangan/pemulihan koneksi.
5. Periksa layar 360, 390, 768, 1024, 1440 px, navigasi keyboard, fokus dialog, dan hasil cetak.

**Batas verifikasi:** belum ada proyek Supabase, sehingga integrasi Auth/SMTP, Realtime, konkurensi multi-koneksi, dan deployment belum diverifikasi langsung. Browser terintegrasi sesi pengembangan tidak tersedia; pemeriksaan visual otomatis belum dilakukan. Build lokal tidak berarti seluruh Definition of Done PRD sudah lolos.

## Deploy Vercel

1. Push repository ke GitHub. Pastikan `.env.local` dan `data/` diabaikan.
2. Import di Vercel, framework **Next.js**, Node.js 22+.
3. Tambahkan tiga environment variable di atas. Isi `NEXT_PUBLIC_SITE_URL` dengan domain final HTTPS.
4. Build `npm run build`. Tidak diperlukan server SQLite/proses background.
5. Atur Site URL dan redirect callback/reset Supabase ke domain final secara tepat.
6. Jalankan pengujian integrasi di atas. Pisahkan database staging dan produksi.

Belum ada deployment yang diterbitkan dalam sesi pengerjaan ini.

## Struktur

```text
app/                         Pages, API, auth callback, CSS
components/                  React dashboard, booking, auth, admin, chat, profile
components/ui/dialog.tsx     Radix dialog
lib/                         Types, validation, date helpers, demo, Supabase clients
proxy.ts                     Refresh session dan route guard
supabase/                    SQL migration dan seed
tests/                       Unit dan PostgreSQL policy tests
.github/workflows/ci.yml      Typecheck, tests, production build
legacy/public/               Frontend Node/SQLite lama, tidak dilayani Next.js
server.js                    Server lama (npm run legacy)
data/                        SQLite lama, tidak diubah
```

Inter disajikan lokal melalui `@fontsource/inter`. Ikon Lucide dan ilustrasi bus SVG lokal; tidak ada gambar pihak ketiga saat runtime.

Referensi: [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PGlite extensions](https://pglite.dev/extensions/).
