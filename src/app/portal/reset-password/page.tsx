import { Suspense } from "react";
import { SucofindoLogo } from "@/components/brand/SucofindoLogo";
import { ResetPasswordForm } from "@/components/portal/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-slate-950 p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <SucofindoLogo height={40} className="mb-2" />
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-blue dark:text-brand-teal">
            Ensuring Quality, Protecting Trust
          </span>
        </div>

        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
