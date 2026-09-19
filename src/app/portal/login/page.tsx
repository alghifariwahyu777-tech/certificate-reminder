import { Suspense } from "react";
import Link from "next/link";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";
import { PortalWhatsAppButton } from "@/components/portal/PortalWhatsAppButton";
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
            Your Certifications, Always in Control.
          </h2>
          <p className="text-slate-400 mt-4 max-w-sm text-sm">
            Monitor your certification status, validity, and supporting documents in one
            easy-to-access portal.
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

          <p className="text-center text-sm text-slate-400 mt-6">
            Anda staf internal Sucofindo?{" "}
            <Link href="/login" className="text-accent hover:text-accent-light font-medium">
              Masuk ke Admin Panel
            </Link>
          </p>
        </div>
      </div>
      <PortalWhatsAppButton context="login" />
    </div>
  );
}
