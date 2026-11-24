export type Feature = {
  id: string;
  label: string;
  description: string;
  keywords: string;
  page?: string;
  tab?: string;
  adminOnly?: boolean;
};

export const features: Feature[] = [
  { id: "dashboard", label: "Dashboard", description: "Ringkasan perjalanan hari ini", keywords: "beranda home perjalanan", page: "dashboard" },
  { id: "orders", label: "Pesanan saya", description: "Tiket, riwayat, dan pembatalan pesanan", keywords: "booking reservasi tiket riwayat batal", page: "orders" },
  { id: "schedules", label: "Jadwal bus", description: "Cari perjalanan dan pesan kursi", keywords: "jadwal keberangkatan rute halte kursi pesan", page: "schedules" },
  { id: "chat", label: "Chat bantuan", description: "Percakapan dengan pengelola", keywords: "bantuan help dukungan pesan admin", page: "chat" },
  { id: "profile", label: "Profil saya", description: "Nama, fakultas, dan program studi", keywords: "identitas mahasiswa nim fakultas prodi program studi telepon", page: "profile" },
  { id: "settings", label: "Pengaturan", description: "Informasi akun dan kata sandi", keywords: "setting password keamanan sandi akun", page: "settings" },
  { id: "notifications", label: "Notifikasi", description: "Pemberitahuan perjalanan dan pesan", keywords: "notifikasi pemberitahuan lonceng" },
  { id: "fleet", label: "Status bus", description: "Lihat armada dan kapasitas bus", keywords: "bus armada kapasitas status" },
  { id: "manage", label: "Kelola operasional", description: "Pengaturan operasional bus", keywords: "kelola manajemen admin", page: "manage", adminOnly: true },
  { id: "manage-schedule", label: "Kelola jadwal", description: "Tambah atau ubah keberangkatan", keywords: "jadwal tambah edit keberangkatan", page: "manage", tab: "schedule", adminOnly: true },
  { id: "manage-bus", label: "Kelola armada", description: "Tambah atau ubah bus", keywords: "bus armada kendaraan kapasitas", page: "manage", tab: "bus", adminOnly: true },
  { id: "manage-route", label: "Kelola rute", description: "Rute dan urutan halte", keywords: "rute jalur urutan perjalanan", page: "manage", tab: "route", adminOnly: true },
  { id: "manage-stop", label: "Kelola halte", description: "Titik jemput dan turun", keywords: "halte lokasi jemput turun", page: "manage", tab: "stop", adminOnly: true },
  { id: "students", label: "Mahasiswa", description: "Daftar mahasiswa terdaftar", keywords: "mahasiswa pengguna daftar akun", page: "students", adminOnly: true },
  { id: "logout", label: "Logout", description: "Keluar dari akun", keywords: "logout keluar sign out" },
];

export function searchFeatures(query: string, admin: boolean) {
  const words = query.toLocaleLowerCase("id-ID").trim().split(/\s+/).filter(Boolean);
  return features.filter((feature) => {
    if (feature.adminOnly && !admin) return false;
    if (admin && feature.id === "schedules") return false;
    const text = `${feature.label} ${feature.description} ${feature.keywords}`.toLocaleLowerCase("id-ID");
    return words.every((word) => text.includes(word));
  }).sort((a, b) => {
    const score = (feature: Feature) => {
      const label = feature.label.toLocaleLowerCase("id-ID");
      return words.filter((word) => label.includes(word)).length;
    };
    return score(b) - score(a);
  });
}
