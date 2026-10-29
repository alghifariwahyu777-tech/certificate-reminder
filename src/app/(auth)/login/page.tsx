import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SucofindoLogo, SucofindoMark } from "@/components/brand/SucofindoLogo";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-paper dark:bg-slate-950 relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Left: ledger rail panel, hidden on small screens */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-[#1A5A8E] via-[#123F6B] to-[#0A2440] text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white shrink-0 p-1.5">
            <SucofindoMark size={26} />
          </div>
          <div>
            <span className="font-display font-semibold text-lg block leading-tight">Reminder System</span>
            <span className="font-mono text-[11px] text-brand-teal">
              Ensuring Quality, Protecting Trust
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-300 mb-3">
            PT Sucofindo (Persero)
          </p>
          <h2 className="font-display text-3xl font-semibold leading-tight max-w-md">
            Pantau masa berlaku. Tindak lanjuti tepat waktu.
          </h2>
          <p className="text-slate-300 mt-4 max-w-sm text-sm">
            Satu sistem untuk memantau sertifikat klien, sertifikasi personil, project, dan kalibrasi alat.
          </p>
        </div>

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} PT Sucofindo (Persero). Untuk penggunaan internal.
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <SucofindoLogo height={40} className="mb-2" />
            <span className="font-mono text-[10px] text-brand-blue dark:text-brand-teal">
              Ensuring Quality, Protecting Trust
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink mb-1.5">Masuk</h1>
          <p className="text-sm text-slate-500 mb-8">
            Gunakan email dan kata sandi akun Anda.
          </p>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <p className="text-center text-sm text-slate-500 mt-6">
            Anda klien Sucofindo?{" "}
            <Link href="/portal/login" className="text-accent hover:text-accent-light font-medium">
              Masuk ke Portal Klien
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
