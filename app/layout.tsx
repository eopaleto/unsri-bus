import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "UNSRI Bus — Perjalanan Kampus Lebih Mudah",
  description:
    "Jadwal bus, reservasi kursi, tiket digital, dan bantuan mahasiswa UNSRI.",
  icons: { icon: "/favicon.svg" },
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
