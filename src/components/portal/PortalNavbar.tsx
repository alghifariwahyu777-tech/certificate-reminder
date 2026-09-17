"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileBadge2, Layers, ClipboardList, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SucofindoMark } from "@/components/brand/SucofindoLogo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/certificates", label: "Sertifikat Saya", icon: FileBadge2 },
  { href: "/portal/applications", label: "Pengajuan Saya", icon: ClipboardList },
  { href: "/portal/services", label: "Layanan", icon: Layers },
];

export function PortalNavbar({ clientName, userName }: { clientName: string; userName: string }) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30">
      <div className="bg-ink px-5 md:px-8 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shrink-0 p-1">
              <SucofindoMark size={20} />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-white leading-tight">
                Client Portal
              </p>
              <p className="text-[11px] text-brand-teal font-mono uppercase tracking-wide leading-tight">
                {clientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-brand-teal text-white flex items-center justify-center text-xs font-semibold font-mono">
                {initials || "U"}
              </div>
              <span className="text-sm text-white">{userName}</span>
            </div>
            <form action="/api/portal/auth/logout" method="POST">
              <button
                type="submit"
                className="p-2 rounded hover:bg-white/10 text-slate-300 hover:text-white"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      <nav className="flex items-center gap-1 px-5 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors",
                active
                  ? "border-brand-teal text-ink dark:text-slate-100 font-medium"
                  : "border-transparent text-slate-500 hover:text-ink dark:hover:text-slate-200"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}