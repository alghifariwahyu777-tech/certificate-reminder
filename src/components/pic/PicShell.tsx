import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { SucofindoMark } from "@/components/brand/SucofindoLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Minimal frame for PIC screens and the emailed update link — no admin sidebar. */
export function PicShell({ children, userName }: { children: React.ReactNode; userName?: string }) {
  return (
    <div className="min-h-screen bg-paper dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-paper/95 dark:bg-slate-950/95 backdrop-blur">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Link href={userName ? "/pic" : "#"} className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 p-1 shrink-0">
              <SucofindoMark size={18} />
            </span>
            <span className="min-w-0">
              <span className="block font-display font-semibold text-sm text-ink dark:text-slate-100 leading-tight">Reminder System</span>
              <span className="block text-[11px] text-slate-500 leading-tight truncate">{userName ? `Update Progres · ${userName}` : "Update Progres Project"}</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {userName && (
              <>
                <Link href="/pic/password" title="Ganti password" aria-label="Ganti password" className="p-2 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <KeyRound className="h-4 w-4" />
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" title="Keluar" aria-label="Keluar" className="p-2 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      <footer className="max-w-2xl mx-auto px-4 pb-6 text-[11px] text-slate-400 font-mono">PT Sucofindo (Persero) · Reminder System</footer>
    </div>
  );
}
