# Arsip — UNSRI Bus Node.js / SQLite

Dokumen ini menjelaskan versi sebelumnya. Aplikasi utama sekarang menggunakan Next.js dan Supabase; lihat README di root proyek.

Prototipe aplikasi pemesanan bus untuk mahasiswa Universitas Sriwijaya (UNSRI), dilengkapi dua peran pengguna: **mahasiswa** dan **administrator**. Tampilan responsif untuk desktop dan smartphone.

> **Penting:** Ini **bukan portal transportasi resmi UNSRI**. Semua jadwal, armada, NIM akun demo, tarif, dan lokasi rute adalah **data simulasi**. Jangan gunakan untuk mengatur perjalanan nyata tanpa integrasi/validasi dengan pihak kampus.

## Menjalankan proyek

**Persyaratan:** Node.js **22.13 atau lebih baru**. Tidak perlu memasang package, server database, atau dependensi pihak ketiga.

```bash
# Buka folder proyek
cd unsri-bus

# Jalankan server lokal
npm start
```

Kemudian buka **http://127.0.0.1:3000** pada browser.

Untuk pengembangan (otomatis restart jika server.js berubah):

```bash
npm run dev
```

Untuk mengganti port:

```bash
# macOS/Linux
PORT=4000 npm start

# Windows PowerShell
$env:PORT=4000; npm start
```

Secara default server hanya dapat diakses dari komputer lokal (`127.0.0.1`). Untuk uji LAN internal saja, atur `HOST=0.0.0.0` dengan pertimbangan keamanan yang sesuai. **Jangan menerbitkan demo ke internet menggunakan kredensial contoh.**

## Akun demo

| Peran | Login (email) | Password |
|---|---|---|
| Admin | `admin@unsri.demo` | `Admin123!` |
| Mahasiswa | `mahasiswa@unsri.demo` | `Mahasiswa123!` |

Atau dari halaman beranda, pilih **Daftar** dan isi nama, NIM, email, serta kata sandi untuk membuat akun mahasiswa baru. Hanya admin yang sudah tersedia di database yang bisa mengelola jadwal (tidak ada registrasi admin publik).

## Fitur yang sudah berfungsi

### Mahasiswa
- Registrasi manual dan login memakai email atau NIM.
- Dashboard ringkasan jumlah tiket dan perjalanan terdekat.
- Pencarian rute, tanggal, dan nama bus.
- Rincian perjalanan (jam, tanggal, nomor bus, kapasitas, tarif).
- Denah kursi interaktif dengan kursi tersedia / terisi.
- Pemesanan tiket, kode booking, dan tampilan e-ticket yang dapat dicetak atau disimpan PDF oleh browser.
- Riwayat pesanan, filter status, pencarian kode, dan pembatalan sebelum jam keberangkatan.
- Chat bantuan untuk mengirim pesan kepada admin.
- Profil dan ganti password.

### Admin
- Dashboard statistik mahasiswa, jadwal, jumlah tiket dan pesan.
- Manajemen jadwal: tambah, edit, dan batalkan.
- Manajemen kapasitas armada dan tarif.
- Pembatalan jadwal otomatis membatalkan tiket aktif di jadwal terkait.
- Daftar pesanan beserta rincian mahasiswa dan kursinya.
- Daftar mahasiswa terdaftar.
- Inbox chat masing-masing mahasiswa dan balas pesan.
- Edit profil dan ganti password.

### Data dan keamanan dasar
- Database **SQLite** lokal yang persisten di `data/unsri-bus.sqlite` (terbuat otomatis saat server pertama dijalankan).
- **Node.js HTTP server** melayani frontend dan REST API, tanpa layanan eksternal.
- Password disimpan dalam bentuk hash + salt menggunakan `crypto.scrypt`.
- Session login dengan token acak di cookie **HttpOnly** dan `SameSite=Lax` (7 hari), token sesi di database dalam bentuk hash.
- Hak akses diverifikasi oleh backend untuk operasi khusus admin dan data mahasiswa.
- Reservasi kursi menggunakan transaksi SQLite dengan unique index, sehingga dua pengguna tidak bisa memiliki kursi aktif yang sama pada jadwal yang sama.
- Validasi input di server dan escaping teks pada antarmuka.
- Rate limit sederhana untuk login dan registrasi.

## Struktur folder

```text
unsri-bus/
├── package.json
├── server.js               # HTTP server, SQLite, API, otorisasi, seed demo
├── public/
│   ├── index.html          # HTML utama
│   ├── styles.css          # CSS responsif
│   ├── app.js              # UI & state halaman (JavaScript browser)
│   └── favicon.svg         # Ikon aplikasi
├── data/
│   └── (SQLite dibuat otomatis saat mulai)
└── README.md
```

## Gambaran API

| HTTP | Endpoint | Akses |
|---|---|---|
| POST | `/api/auth/register` | Publik: registrasi mahasiswa |
| POST | `/api/auth/login` | Publik |
| GET | `/api/auth/me` | Login |
| POST | `/api/auth/logout` | Login |
| GET | `/api/public/trips` | Publik (jadwal contoh) |
| GET | `/api/dashboard` | Login (sesuai role) |
| GET | `/api/trips` | Login |
| GET | `/api/trips/:id/seats` | Login |
| GET, POST | `/api/bookings` | Login; POST mahasiswa |
| POST | `/api/bookings/:id/cancel` | Pemilik tiket atau admin |
| GET, POST | `/api/chat/:studentId` | Pemilik percakapan atau admin |
| GET | `/api/chat/conversations` | Admin |
| GET | `/api/admin/students` | Admin |
| POST | `/api/admin/trips` | Admin |
| PATCH | `/api/admin/trips/:id` | Admin |
| PATCH | `/api/profile` | Login |
| POST | `/api/profile/password` | Login |

Semua respons JSON menggunakan format `{ "data": ... }` atau `{ "error": "..." }`.

## Catatan sebelum deployment produksi

Proyek ini dibuat untuk **demo, belajar, dan pengembangan awal**. Sebelum digunakan kampus, lakukan penyesuaian seperti verifikasi NIM terhadap sistem akademik/SSO universitas, kebijakan identitas mahasiswa, HTTPS, keamanan CSRF, rate limit permanen berbasis penyimpanan, log audit admin, notifikasi pembatalan, pengelolaan tempat naik/turun yang nyata, pencadangan database, pengujian load, ketentuan privasi, pengelolaan akun demo, dan hosting database/server yang sesuai. `node:sqlite` pada Node.js 22 masih dapat menampilkan peringatan eksperimental.

Jadwal contoh dibuat otomatis untuk 8 hari mendatang saat database pertama kali dibentuk. Untuk **reset data demo**, hentikan server dan hapus berkas SQLite di folder `data/` (termasuk berkas `-wal` dan `-shm` jika ada); data awal akan di-seed ulang saat server dijalankan kembali.
