import { Suspense } from "react";
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
      <div className="hidden lg:flex lg:w-1/2 bg-ink ledger-rail text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white shrink-0 p-1.5">
            <SucofindoMark size={26} />
          </div>
          <div>
            <span className="font-display font-semibold text-lg block leading-tight">Certificate Reminder</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-teal">
              Ensuring Quality, Protecting Trust
            </span>
          </div>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-3">
            PT Sucofindo (Persero) — Internal System
          </p>
          <h2 className="font-display text-3xl font-semibold leading-tight max-w-md">
            Track. Remind. Renew. Stay Certified.
          </h2>
          <p className="text-slate-400 mt-4 max-w-sm text-sm">
            An internal platform to monitor client certifications, inspections, and
  calibrations—keeping validity, renewals, and supporting documents under control.
          </p>
        </div>

        <p className="text-xs text-slate-500 font-mono">
          © {new Date().getFullYear()} PT Sucofindo (Persero) — Internal Use Only
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <SucofindoLogo height={40} className="mb-2" />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-blue dark:text-brand-teal">
              Ensuring Quality, Protecting Trust
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink mb-1.5">Masuk ke akun Admin</h1>
          <p className="text-sm text-slate-500 mb-8">
            Masukkan email dan kata sandi Anda untuk mengelola registry sertifikat.
          </p>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}



