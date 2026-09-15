import { MobileNav } from "./MobileNav";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar({
  title,
  subtitle,
  adminName,
  role = "ADMIN",
}: {
  title: string;
  subtitle?: string;
  adminName: string;
  role?: "ADMIN" | "VIEWER";
}) {
  const initials = adminName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-paper/95 dark:bg-slate-950/95 backdrop-blur px-5 py-4 md:px-8">
      <div className="flex items-center gap-3">
        <MobileNav role={role} />
        <div>
          <h1 className="font-display font-semibold text-lg text-ink dark:text-slate-100 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <NotificationBell />
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-ink dark:text-slate-100 leading-tight">{adminName}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight font-mono uppercase tracking-wide">
            {role === "ADMIN" ? "Admin" : "Viewer"}
          </p>
        </div>
        <div className="h-9 w-9 rounded-full bg-ink text-white flex items-center justify-center text-xs font-semibold font-mono">
          {initials || "AD"}
        </div>
      </div>
    </header>
  );
}
