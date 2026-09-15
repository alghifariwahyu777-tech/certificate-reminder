import { LoginForm } from "@/components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-paper dark:bg-slate-950 relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Left: ledger rail panel, hidden on small screens */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink ledger-rail text-white flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-accent/20 text-accent-light">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-display font-semibold text-lg">Certificate Reminder</span>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-3">
            PT Sucofindo (Persero) — Internal System
          </p>
          <h2 className="font-display text-3xl font-semibold leading-tight max-w-md">
            Setiap sertifikat klien punya tanggal kedaluwarsa. Jangan biarkan itu jadi kejutan.
          </h2>
          <p className="text-slate-400 mt-4 max-w-sm text-sm">
            Satu dasbor internal untuk memantau sertifikasi, inspeksi, dan kalibrasi milik seluruh
            klien Sucofindo — lengkap dengan status, riwayat renewal, dan dokumen pendukung.
          </p>
        </div>

        <p className="text-xs text-slate-500 font-mono">
          © {new Date().getFullYear()} PT Sucofindo (Persero) — Internal Use Only
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-ink text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-display font-semibold text-lg text-ink">Certificate Reminder</span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink mb-1.5">Masuk ke akun Admin</h1>
          <p className="text-sm text-slate-500 mb-8">
            Masukkan email dan kata sandi Anda untuk mengelola registry sertifikat.
          </p>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
