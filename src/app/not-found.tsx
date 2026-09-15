import Link from "next/link";
import { FileWarning } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper text-center px-6">
      <FileWarning className="h-10 w-10 text-slate-300 mb-4" />
      <h1 className="font-display text-2xl font-semibold text-ink mb-2">Halaman tidak ditemukan</h1>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">
        Data yang Anda cari mungkin sudah dihapus atau alamat halaman tidak valid.
      </p>
      <Link href="/dashboard" className="text-sm font-medium text-accent hover:text-accent-light">
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
