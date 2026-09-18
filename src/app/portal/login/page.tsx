import { Suspense } from "react";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";
import { SucofindoLogo, SucofindoMark } from "@/components/brand/SucofindoLogo";

export default function PortalLoginPage() {
  return (
    <div className="min-h-screen flex bg-paper dark:bg-slate-950">
      <div className="hidden lg:flex lg:w-1/2 bg-ink text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white shrink-0 p-1.5">
            <SucofindoMark size={26} />
          </div>
          <div>
            <span className="font-display font-semibold text-lg block leading-tight">Client Portal</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-teal">
              Ensuring Quality, Protecting Trust
            </span>
          </div>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-3">
            PT Sucofindo (Persero)
          </p>
          <h2 className="font-display text-3xl font-semibold leading-tight max-w-md">
            Pantau sertifikat perusahaan Anda, kapan saja.
          </h2>
          <p className="text-slate-400 mt-4 max-w-sm text-sm">
            Lihat status, masa berlaku, dan dokumen sertifikat perusahaan Anda langsung dari
            portal ini.
          </p>
        </div>

        <p className="text-xs text-slate-500 font-mono">
          © {new Date().getFullYear()} PT Sucofindo (Persero) — Client Portal
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <SucofindoLogo height={40} className="mb-2" />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-blue dark:text-brand-teal">
              Ensuring Quality, Protecting Trust
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink dark:text-slate-100 mb-1.5">
            Masuk ke Client Portal
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            Khusus untuk klien PT Sucofindo (Persero) yang menggunakan jasa sertifikasi.
          </p>

          <Suspense fallback={null}>
            <PortalLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
