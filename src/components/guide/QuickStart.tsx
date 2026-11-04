"use client";

import Link from "next/link";
import { useState } from "react";
import { TabNav } from "@/components/ui/TabNav";

export type QuickRole = "PM" | "FINANCE" | "QHSE" | "HC" | "MANAGEMENT" | "ADMIN";

type Action = { what: string; when: string; href: string; where: string };

const TABS: { key: QuickRole; label: string }[] = [
  { key: "PM", label: "Project Manager" },
  { key: "FINANCE", label: "Keuangan" },
  { key: "QHSE", label: "QHSE" },
  { key: "HC", label: "Human Capital" },
  { key: "MANAGEMENT", label: "Manajemen" },
  { key: "ADMIN", label: "Administrator" },
];

const ACTIONS: Record<QuickRole, Action[]> = {
  PM: [
    { what: "Perbarui progres project", when: "Setiap ada kemajuan, boleh harian", href: "/projects", where: "Daftar Project, pilih project, Perbarui progres" },
    { what: "Isi milestone dengan rencana mulai, rencana selesai, dan bobot", when: "Awal project", href: "/projects", where: "Daftar Project, pilih project, Jadwal dan progres" },
    { what: "Catat biaya dan pilih penyebabnya", when: "Setiap ada biaya", href: "/projects", where: "Daftar Project, pilih project, Keuangan" },
    { what: "Catat kendala dan risiko", when: "Saat terjadi", href: "/projects", where: "Daftar Project, pilih project, Risiko HSE dan tim" },
    { what: "Selesaikan daftar tugas bagian PM", when: "Setiap minggu", href: "/tasks", where: "Tugas Saya" },
  ],
  FINANCE: [
    { what: "Unggah RAB project", when: "Awal project", href: "/projects", where: "Daftar Project, pilih project, Keuangan, RAB dan biaya" },
    { what: "Isi termin pembayaran", when: "Awal project", href: "/projects", where: "Daftar Project, pilih project, Keuangan, Termin dan penagihan" },
    { what: "Catat invoice dan pembayaran", when: "Setiap penagihan", href: "/projects", where: "Daftar Project, pilih project, Keuangan, Termin dan penagihan" },
    { what: "Catat biaya satu per satu atau impor Excel", when: "Setiap ada biaya", href: "/projects", where: "Daftar Project, pilih project, Keuangan, RAB dan biaya" },
    { what: "Tagih termin yang sudah siap, kejar invoice lewat jatuh tempo", when: "Setiap minggu", href: "/tasks", where: "Tugas Saya" },
  ],
  QHSE: [
    { what: "Isi laporan HSE bulan lalu", when: "Paling lambat tanggal 5", href: "/projects", where: "Daftar Project, pilih project, Risiko HSE dan tim, HSE" },
    { what: "Catat risiko HSE dan tindak lanjutnya", when: "Saat ditemukan", href: "/projects", where: "Daftar Project, pilih project, Risiko HSE dan tim" },
    { what: "Perbarui jadwal kalibrasi alat", when: "Setelah kalibrasi", href: "/equipment", where: "Kalibrasi Alat" },
    { what: "Periksa project yang belum melapor", when: "Setiap bulan", href: "/tasks", where: "Tugas Saya" },
  ],
  HC: [
    { what: "Perbarui data karyawan dan sertifikasinya", when: "Saat ada perubahan", href: "/personnel-certifications", where: "Personil, Sertifikasi" },
    { what: "Tugaskan personil ke project", when: "Awal project", href: "/projects/personnel", where: "Penugasan Personil" },
    { what: "Perpanjang sertifikasi yang akan berakhir", when: "Sebelum tanggal berakhir", href: "/tasks", where: "Tugas Saya" },
  ],
  MANAGEMENT: [
    { what: "Baca angka utama dan project kritis", when: "Setiap minggu", href: "/projects/dashboard", where: "Monitoring Project, tab Ringkasan" },
    { what: "Bandingkan kinerja per portofolio", when: "Setiap bulan", href: "/projects/dashboard", where: "Monitoring Project, tab Ringkasan" },
    { what: "Baca laporan mingguan", when: "Setiap Senin", href: "/projects/weekly-report", where: "Laporan Mingguan" },
    { what: "Putuskan tindak lanjut project kritis", when: "Saat diperlukan", href: "/tasks", where: "Tugas Saya, bagian Manajemen" },
  ],
  ADMIN: [
    { what: "Buat akun dan pilih perannya", when: "Saat ada pengguna baru", href: "/users", where: "Pengguna" },
    { what: "Atur batas waspada, kritis, dan pengingat", when: "Sekali di awal", href: "/settings", where: "Pengaturan" },
    { what: "Kelola sertifikat klien dan permohonan", when: "Setiap hari", href: "/certificate", where: "Klien, Sertifikat dan Permohonan" },
    { what: "Periksa tugas semua bagian", when: "Setiap minggu", href: "/tasks", where: "Tugas Saya" },
  ],
};

/** "Mulai cepat": the 3 to 5 things each role does, with a link straight to the page. */
export function QuickStart({ initial }: { initial: QuickRole }) {
  const [role, setRole] = useState<QuickRole>(initial);
  return (
    <div>
      <TabNav tabs={TABS} value={role} onChange={setRole} label="Pilih peran" />
      <ol className="mt-3 divide-y divide-line/70 dark:divide-slate-800">
        {ACTIONS[role].map((a, i) => (
          <li key={a.what} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-3 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-blueDark text-[11px] font-bold text-white">{i + 1}</span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-ink dark:text-slate-100">{a.what}</span>
              <span className="block text-[12px] text-slate-500">
                {a.when}. Menu: {a.where}
              </span>
            </span>
            <Link href={a.href} className="shrink-0 rounded-md border border-line px-2.5 py-1 text-[12px] font-semibold text-accent hover:bg-paper dark:border-slate-700 dark:hover:bg-slate-800">
              Buka
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
