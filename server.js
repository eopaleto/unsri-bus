'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.join(__dirname, 'legacy', 'public');
const DATA = path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'unsri-bus.sqlite'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  nim TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','admin')),
  faculty TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  date TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  bus_name TEXT NOT NULL,
  plate TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK(capacity BETWEEN 4 AND 60),
  price INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  trip_id INTEGER NOT NULL REFERENCES trips(id),
  seat_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_seat ON bookings(trip_id, seat_number) WHERE status='confirmed';
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_student_trip ON bookings(trip_id, user_id) WHERE status='confirmed';
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_student ON messages(student_id,id);
`);

const hashPassword = password => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};
function comparePassword(password, stored) {
  const [salt, hex] = (stored || '').split(':');
  if (!salt || !hex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function seed() {
  if (!db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get()) {
    db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
      .run('Admin Transportasi', 'admin@unsri.demo', hashPassword('Admin123!'), 'admin');
  }
  if (!db.prepare("SELECT id FROM users WHERE email='mahasiswa@unsri.demo'").get()) {
    db.prepare('INSERT INTO users (name,nim,email,password_hash,role,faculty,phone) VALUES (?,?,?,?,?,?,?)')
      .run('Alya Putri', '09011282328001', 'mahasiswa@unsri.demo', hashPassword('Mahasiswa123!'), 'student', 'Fakultas Ilmu Komputer', '081234567890');
  }
  if (!db.prepare('SELECT id FROM trips LIMIT 1').get()) {
    const todayJakarta = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const addDays = (date, days) => new Date(new Date(date + 'T00:00:00Z').getTime() + days * 86400000).toISOString().slice(0, 10);
    const initial = todayJakarta();
    const insert = db.prepare(`INSERT INTO trips (code,origin,destination,date,departure_time,arrival_time,bus_name,plate,capacity,price)
                               VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const patterns = [
      ['Palembang', 'Indralaya', '06:30', '07:45', 'Bus Sriwijaya 01', 'BG 1701 UN', 32],
      ['Palembang', 'Indralaya', '09:00', '10:15', 'Bus Sriwijaya 02', 'BG 1702 UN', 36],
      ['Indralaya', 'Palembang', '13:00', '14:15', 'Bus Sriwijaya 03', 'BG 1703 UN', 32],
      ['Indralaya', 'Palembang', '16:30', '17:45', 'Bus Sriwijaya 04', 'BG 1704 UN', 36]
    ];
    for (let d = 1; d <= 8; d++) {
      const date = addDays(initial, d);
      patterns.forEach((p, i) => insert.run(`UB-${date.replace(/-/g, '')}-${i + 1}`, p[0], p[1], date, p[2], p[3], p[4], p[5], p[6], 0));
    }
    const demoStudent = db.prepare("SELECT id FROM users WHERE email='mahasiswa@unsri.demo'").get();
    const firstTrip = db.prepare('SELECT id FROM trips ORDER BY date,departure_time LIMIT 1').get();
    if (demoStudent && firstTrip) {
      db.prepare('INSERT INTO bookings (code,user_id,trip_id,seat_number) VALUES (?,?,?,?)')
        .run('UB-DEMO-001', demoStudent.id, firstTrip.id, 7);
      db.prepare('INSERT INTO messages (student_id,sender_id,body) VALUES (?,?,?)')
        .run(demoStudent.id, demoStudent.id, 'Halo, apakah saya perlu menunjukkan tiket saat naik bus?');
      const admin = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
      db.prepare('INSERT INTO messages (student_id,sender_id,body) VALUES (?,?,?)')
        .run(demoStudent.id, admin.id, 'Halo! Ya, cukup tunjukkan kode tiket di menu Pesanan kepada petugas. Selamat bepergian!');
    }
  }
}
seed();

const send = (res, status, data, extras={}) => {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extras
  });
  res.end(payload);
};
const fail = (status, message) => { const err = new Error(message); err.status = status; throw err; };
const ok = (res, data, status=200, extras={}) => send(res, status, {data}, extras);
const clean = value => String(value ?? '').trim();
const cookie = (name, token, maxAge) => `${name}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const publicUser = u => u ? ({id:u.id,name:u.name,nim:u.nim,email:u.email,role:u.role,faculty:u.faculty,phone:u.phone}) : null;
function currentUser(req) {
  const raw = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('unsri_session='));
  const token = raw?.split('=')[1];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at > datetime('now')`)
    .get(crypto.createHash('sha256').update(token).digest('hex')) || null;
}
const requireUser = req => currentUser(req) || fail(401, 'Silakan masuk untuk melanjutkan.');
function requireAdmin(req) {
  const user = requireUser(req);
  if (user.role !== 'admin') fail(403, 'Hanya admin yang dapat mengakses fitur ini.');
  return user;
}
async function jsonBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk.toString('utf8');
    if (raw.length > 25000) fail(413, 'Ukuran permintaan terlalu besar.');
  }
  try {
    const data = JSON.parse(raw || '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, 'Format data tidak valid.');
    return data;
  } catch (err) { if (err.status) throw err; fail(400, 'Body JSON tidak valid.'); }
}
const todayLocal = () => new Date(Date.now() + 7 * 3600000).toISOString().replace('T',' ').slice(0, 16);
const upcoming = t => `${t.date} ${t.departure_time}` > todayLocal();
const tripSelection = `SELECT t.*, (SELECT COUNT(*) FROM bookings b WHERE b.trip_id=t.id AND b.status='confirmed') AS booked_count FROM trips t`;
const bookingSelection = `SELECT b.*, t.code AS trip_code,t.origin,t.destination,t.date,t.departure_time,t.arrival_time,t.bus_name,t.plate,t.capacity,t.price,t.status AS trip_status,
  u.name AS student_name,u.nim AS student_nim,u.email AS student_email
  FROM bookings b JOIN trips t ON b.trip_id=t.id JOIN users u ON b.user_id=u.id`;
const limits = new Map();
function rateLimit(req, key) {
  const ip = req.socket.remoteAddress || 'local';
  const tag = `${ip}/${key}`;
  const now = Date.now();
  const entry = limits.get(tag) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60000; }
  entry.count++;
  limits.set(tag, entry);
  if (entry.count > 18) fail(429, 'Terlalu banyak percobaan. Coba lagi sebentar.');
}
function validateTrip(body) {
  const origin = clean(body.origin), destination = clean(body.destination);
  const date = clean(body.date), departure_time = clean(body.departure_time), arrival_time = clean(body.arrival_time);
  const bus_name = clean(body.bus_name), plate = clean(body.plate).toUpperCase();
  const capacity = Number(body.capacity), price = Number(body.price ?? 0);
  if (!['Palembang','Indralaya'].includes(origin) || !['Palembang','Indralaya'].includes(destination) || origin === destination) fail(400, 'Rute asal dan tujuan tidak valid.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || date < todayLocal().slice(0, 10)) fail(400, 'Tanggal keberangkatan tidak valid.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(departure_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(arrival_time)) fail(400, 'Format waktu tidak valid.');
  if (`${date} ${departure_time}` <= todayLocal()) fail(400, 'Keberangkatan harus berada di masa depan.');
  if (arrival_time <= departure_time) fail(400, 'Waktu tiba harus setelah waktu berangkat.');
  if (bus_name.length < 3 || bus_name.length > 70 || plate.length < 4 || plate.length > 30) fail(400, 'Nama bus atau nomor polisi tidak valid.');
  if (!Number.isInteger(capacity) || capacity < 4 || capacity > 60) fail(400, 'Kapasitas harus 4 sampai 60 kursi.');
  if (!Number.isInteger(price) || price < 0 || price > 1000000) fail(400, 'Tarif tidak valid.');
  return {origin,destination,date,departure_time,arrival_time,bus_name,plate,capacity,price};
}
function bookingCode() { return 'TKT-' + crypto.randomBytes(4).toString('hex').toUpperCase(); }

async function api(req, res, url) {
  const m = req.method, p = url.pathname;
  if (m === 'GET' && p === '/api/public/trips') {
    const trips = db.prepare(`${tripSelection} WHERE t.status='active' AND t.date >= ? ORDER BY t.date,t.departure_time LIMIT 12`).all(todayLocal().slice(0,10));
    return ok(res, trips);
  }
  if (m === 'POST' && p === '/api/auth/register') {
    rateLimit(req, 'register');
    const b = await jsonBody(req);
    const name = clean(b.name), nim = clean(b.nim), email = clean(b.email).toLowerCase(), password = String(b.password || '');
    if (name.length < 3 || name.length > 80) fail(400, 'Nama harus berisi 3–80 karakter.');
    if (!/^\d{7,20}$/.test(nim)) fail(400, 'NIM harus berisi 7–20 digit angka.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 140) fail(400, 'Alamat email tidak valid.');
    if (password.length < 8 || password.length > 128) fail(400, 'Kata sandi minimal 8 karakter.');
    if (db.prepare('SELECT id FROM users WHERE email=? OR nim=?').get(email,nim)) fail(409, 'Email atau NIM sudah terdaftar.');
    const result = db.prepare('INSERT INTO users (name,nim,email,password_hash,role) VALUES (?,?,?,?,?)')
      .run(name,nim,email,hashPassword(password),'student');
    return ok(res, {id:Number(result.lastInsertRowid),name,email}, 201);
  }
  if (m === 'POST' && p === '/api/auth/login') {
    rateLimit(req, 'login');
    const b = await jsonBody(req);
    const identity = clean(b.identity).toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email=? OR nim=?').get(identity,identity);
    if (!user || !comparePassword(String(b.password || ''),user.password_hash)) fail(401, 'Email/NIM atau kata sandi salah.');
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    db.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,datetime('now','+7 days'))").run(hash,user.id);
    return ok(res, publicUser(user), 200, {'Set-Cookie': cookie('unsri_session',token,604800)});
  }
  if (m === 'POST' && p === '/api/auth/logout') {
    const raw = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('unsri_session='));
    if (raw) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(crypto.createHash('sha256').update(raw.split('=')[1]).digest('hex'));
    return ok(res, {message:'Berhasil keluar.'}, 200, {'Set-Cookie':cookie('unsri_session','',0)});
  }
  if (m === 'GET' && p === '/api/auth/me') return ok(res, publicUser(requireUser(req)));

  if (m === 'GET' && p === '/api/trips') {
    const user = requireUser(req);
    const trips = user.role === 'admin'
      ? db.prepare(`${tripSelection} ORDER BY t.date DESC,t.departure_time DESC`).all()
      : db.prepare(`${tripSelection} WHERE t.status='active' AND t.date>=? ORDER BY t.date,t.departure_time`).all(todayLocal().slice(0,10));
    return ok(res, trips);
  }
  const seatPath = p.match(/^\/api\/trips\/(\d+)\/seats$/);
  if (m === 'GET' && seatPath) {
    requireUser(req);
    const trip = db.prepare(`${tripSelection} WHERE t.id=?`).get(Number(seatPath[1]));
    if (!trip) fail(404,'Jadwal tidak ditemukan.');
    const seats = db.prepare("SELECT seat_number FROM bookings WHERE trip_id=? AND status='confirmed'").all(trip.id).map(b=>b.seat_number);
    return ok(res,{trip,occupied:seats});
  }
  if (m === 'GET' && p === '/api/bookings') {
    const u = requireUser(req);
    const bookings = u.role === 'admin'
      ? db.prepare(`${bookingSelection} ORDER BY b.created_at DESC,b.id DESC`).all()
      : db.prepare(`${bookingSelection} WHERE b.user_id=? ORDER BY b.created_at DESC,b.id DESC`).all(u.id);
    return ok(res, bookings);
  }
  if (m === 'POST' && p === '/api/bookings') {
    const u = requireUser(req);
    if (u.role !== 'student') fail(403,'Hanya mahasiswa dapat memesan tiket.');
    const b = await jsonBody(req), tripId = Number(b.trip_id), seat = Number(b.seat_number);
    if (!Number.isInteger(tripId) || !Number.isInteger(seat)) fail(400,'Pilih perjalanan dan kursi yang valid.');
    let booking;
    db.exec('BEGIN IMMEDIATE');
    try {
      const trip = db.prepare('SELECT * FROM trips WHERE id=?').get(tripId);
      if (!trip || trip.status !== 'active' || !upcoming(trip)) fail(400,'Jadwal ini sudah tidak tersedia.');
      if (seat < 1 || seat > trip.capacity) fail(400,'Nomor kursi tidak tersedia.');
      if (db.prepare("SELECT id FROM bookings WHERE user_id=? AND trip_id=? AND status='confirmed'").get(u.id,tripId)) fail(409,'Anda sudah memiliki tiket untuk jadwal ini.');
      if (db.prepare("SELECT id FROM bookings WHERE trip_id=? AND seat_number=? AND status='confirmed'").get(tripId,seat)) fail(409,'Kursi ini baru saja dipesan pengguna lain.');
      const result = db.prepare('INSERT INTO bookings (code,user_id,trip_id,seat_number) VALUES (?,?,?,?)')
        .run(bookingCode(),u.id,tripId,seat);
      booking = db.prepare(`${bookingSelection} WHERE b.id=?`).get(Number(result.lastInsertRowid));
      db.exec('COMMIT');
    } catch(err) {
      db.exec('ROLLBACK');
      if (err.code?.startsWith('SQLITE_CONSTRAINT')) fail(409,'Kursi sudah terisi. Silakan pilih kursi lain.');
      throw err;
    }
    return ok(res,booking,201);
  }
  const cancelPath = p.match(/^\/api\/bookings\/(\d+)\/cancel$/);
  if (m === 'POST' && cancelPath) {
    const u = requireUser(req), id = Number(cancelPath[1]);
    const b = db.prepare(`${bookingSelection} WHERE b.id=?`).get(id);
    if (!b || (u.role !== 'admin' && b.user_id !== u.id)) fail(404,'Tiket tidak ditemukan.');
    if (b.status !== 'confirmed') fail(409,'Tiket sudah dibatalkan.');
    if (!upcoming(b) && u.role !== 'admin') fail(400,'Tiket setelah waktu keberangkatan tidak dapat dibatalkan.');
    db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(id);
    return ok(res,{id,status:'cancelled'});
  }
  if (m === 'GET' && p === '/api/dashboard') {
    const u = requireUser(req);
    if (u.role === 'admin') {
      const stats = {
        students: db.prepare("SELECT COUNT(*) n FROM users WHERE role='student'").get().n,
        activeTrips: db.prepare("SELECT COUNT(*) n FROM trips WHERE status='active' AND date>=?").get(todayLocal().slice(0,10)).n,
        confirmedBookings: db.prepare("SELECT COUNT(*) n FROM bookings WHERE status='confirmed'").get().n,
        messages: db.prepare('SELECT COUNT(*) n FROM messages').get().n,
        popular: db.prepare(`${tripSelection} WHERE t.status='active' AND t.date >= ? ORDER BY booked_count DESC,t.date ASC LIMIT 5`).all(todayLocal().slice(0,10)),
        recent: db.prepare(`${bookingSelection} ORDER BY b.id DESC LIMIT 5`).all()
      };
      return ok(res,stats);
    }
    const stats = {
      active: db.prepare(`SELECT COUNT(*) n FROM bookings b JOIN trips t ON t.id=b.trip_id WHERE b.user_id=? AND b.status='confirmed' AND t.status='active' AND (t.date||' '||t.departure_time) > ?`).get(u.id,todayLocal()).n,
      total: db.prepare('SELECT COUNT(*) n FROM bookings WHERE user_id=?').get(u.id).n,
      upcoming: db.prepare(`${bookingSelection} WHERE b.user_id=? AND b.status='confirmed' AND t.status='active' AND (t.date||' '||t.departure_time) > ? ORDER BY t.date,t.departure_time LIMIT 1`).get(u.id,todayLocal()) || null,
      recommended: db.prepare(`${tripSelection} WHERE t.status='active' AND (t.date||' '||t.departure_time) > ? ORDER BY t.date,t.departure_time LIMIT 4`).all(todayLocal())
    };
    return ok(res,stats);
  }
  if (m === 'PATCH' && p === '/api/profile') {
    const u = requireUser(req), b=await jsonBody(req), name=clean(b.name), phone=clean(b.phone), faculty=clean(b.faculty);
    if(name.length<3 || name.length>80) fail(400,'Nama harus 3–80 karakter.');
    if(phone.length>25 || (phone && !/^[\d+()\s-]+$/.test(phone))) fail(400,'Nomor telepon tidak valid.');
    if(faculty.length>100) fail(400,'Nama fakultas terlalu panjang.');
    db.prepare('UPDATE users SET name=?,phone=?,faculty=? WHERE id=?').run(name,phone,faculty,u.id);
    return ok(res,publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(u.id)));
  }
  if (m === 'POST' && p === '/api/profile/password') {
    const u=requireUser(req), b=await jsonBody(req);
    if(!comparePassword(String(b.current_password||''),u.password_hash)) fail(400,'Kata sandi saat ini tidak cocok.');
    const next=String(b.new_password||'');
    if(next.length<8 || next.length>128) fail(400,'Kata sandi baru minimal 8 karakter.');
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(next),u.id);
    return ok(res,{message:'Kata sandi berhasil diperbarui.'});
  }
  if (m === 'GET' && p === '/api/chat/conversations') {
    requireAdmin(req);
    const conversations = db.prepare(`SELECT u.id,u.name,u.nim,u.email,
      (SELECT body FROM messages WHERE student_id=u.id ORDER BY id DESC LIMIT 1) last_message,
      (SELECT created_at FROM messages WHERE student_id=u.id ORDER BY id DESC LIMIT 1) last_time,
      (SELECT COUNT(*) FROM messages WHERE student_id=u.id) message_count
      FROM users u WHERE u.role='student' ORDER BY CASE WHEN last_time IS NULL THEN 1 ELSE 0 END, last_time DESC,u.name`).all();
    return ok(res,conversations);
  }
  const convPath = p.match(/^\/api\/chat\/(\d+)$/);
  if (convPath && (m==='GET'||m==='POST')) {
    const u = requireUser(req), studentId=Number(convPath[1]);
    const student=db.prepare("SELECT id,name FROM users WHERE id=? AND role='student'").get(studentId);
    if(!student || (u.role==='student'&&u.id!==studentId)) fail(403,'Anda tidak dapat membuka percakapan ini.');
    if(m==='GET') {
      const messages=db.prepare(`SELECT m.id,m.student_id,m.sender_id,m.body,m.created_at,u.name sender_name,u.role sender_role
        FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.student_id=? ORDER BY m.id ASC LIMIT 300`).all(studentId);
      return ok(res,messages);
    }
    const b=await jsonBody(req), body=clean(b.body);
    if(!body || body.length>1000) fail(400,'Pesan harus berisi 1–1000 karakter.');
    const result=db.prepare('INSERT INTO messages (student_id,sender_id,body) VALUES (?,?,?)').run(studentId,u.id,body);
    return ok(res,{id:Number(result.lastInsertRowid),body},201);
  }
  if(m==='GET' && p==='/api/admin/students') {
    requireAdmin(req);
    return ok(res,db.prepare("SELECT id,name,nim,email,faculty,phone,created_at FROM users WHERE role='student' ORDER BY created_at DESC").all());
  }
  if(m==='POST' && p==='/api/admin/trips') {
    requireAdmin(req);
    const trip=validateTrip(await jsonBody(req));
    const code='UB-'+crypto.randomBytes(4).toString('hex').toUpperCase();
    const r=db.prepare(`INSERT INTO trips(code,origin,destination,date,departure_time,arrival_time,bus_name,plate,capacity,price)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(code,...Object.values(trip));
    return ok(res,db.prepare(`${tripSelection} WHERE t.id=?`).get(Number(r.lastInsertRowid)),201);
  }
  const adminTrip=p.match(/^\/api\/admin\/trips\/(\d+)$/);
  if(adminTrip && m==='PATCH') {
    const admin=requireAdmin(req);
    const id=Number(adminTrip[1]);
    const old=db.prepare('SELECT * FROM trips WHERE id=?').get(id);
    if(!old) fail(404,'Jadwal tidak ditemukan.');
    const b=await jsonBody(req);
    if (clean(b.status)==='cancelled') {
      db.exec('BEGIN IMMEDIATE');
      try {
        const affected = db.prepare("SELECT DISTINCT user_id FROM bookings WHERE trip_id=? AND status='confirmed'").all(id);
        db.prepare("UPDATE trips SET status='cancelled' WHERE id=?").run(id);
        db.prepare("UPDATE bookings SET status='cancelled' WHERE trip_id=? AND status='confirmed'").run(id);
        const alert = db.prepare('INSERT INTO messages (student_id,sender_id,body) VALUES (?,?,?)');
        const notice = `Pemberitahuan: jadwal bus ${old.origin} → ${old.destination} pada ${old.date}, pukul ${old.departure_time} WIB dibatalkan oleh admin. Tiket yang terhubung telah dibatalkan. Silakan pilih jadwal lain.`;
        for (const row of affected) alert.run(row.user_id,admin.id,notice);
        db.exec('COMMIT');
      } catch(e) { db.exec('ROLLBACK'); throw e; }
      return ok(res,db.prepare(`${tripSelection} WHERE t.id=?`).get(id));
    }
    const next=validateTrip({...old,...b});
    const taken=db.prepare("SELECT COALESCE(MAX(seat_number),0) n FROM bookings WHERE trip_id=? AND status='confirmed'").get(id).n;
    if(next.capacity<taken) fail(409,`Kapasitas tidak boleh kurang dari kursi ${taken} yang sudah terisi.`);
    db.prepare(`UPDATE trips SET origin=?,destination=?,date=?,departure_time=?,arrival_time=?,bus_name=?,plate=?,capacity=?,price=? WHERE id=?`)
      .run(...Object.values(next),id);
    return ok(res,db.prepare(`${tripSelection} WHERE t.id=?`).get(id));
  }
  fail(404,'Endpoint tidak ditemukan.');
}

const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json' };
function staticServe(req,res,p) {
  if(req.method!=='GET'&&req.method!=='HEAD') return fail(405,'Metode tidak diperbolehkan.');
  let decoded;
  try { decoded=decodeURIComponent(p); } catch { fail(400,'Path tidak valid.'); }
  const relative=decoded==='/'?'index.html':decoded.replace(/^\/+/, '');
  const file=path.resolve(ROOT,relative);
  if(file!==ROOT && !file.startsWith(ROOT+path.sep)) fail(403,'Akses ditolak.');
  if(!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(404,'Halaman tidak ditemukan.');
  const bytes=fs.readFileSync(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':bytes.length,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
  res.end(req.method==='HEAD'?null:bytes);
}
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(url.pathname.startsWith('/api/')) return await api(req,res,url);
    return staticServe(req,res,url.pathname);
  } catch(e) {
    if(e.code==='SQLITE_CONSTRAINT_UNIQUE') return send(res,409,{error:'Data tersebut sudah digunakan.'});
    const status=e.status||500;
    if(status>=500) console.error('[server]', e);
    return send(res,status,{error:status===500?'Terjadi kesalahan server.':e.message});
  }
});
server.listen(PORT,HOST,()=>{
  console.log(`\nUNSRI Bus berjalan di http://${HOST}:${PORT}`);
  console.log('Demo admin: admin@unsri.demo / Admin123!');
  console.log('Demo mahasiswa: mahasiswa@unsri.demo / Mahasiswa123!\n');
});
