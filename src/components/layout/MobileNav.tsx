"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  FileBadge2,
  FolderKanban,
  Building2,
  Building,
  UserCircle,
  Users,
  ScrollText,
  Bell,
  FileBarChart,
  Mail,
  Trash2,
  Layers,
  FileType,
  ClipboardList,
  Gauge,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SucofindoMark } from "@/components/brand/SucofindoLogo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/certificate", label: "Certificate", icon: FileBadge2, adminOnly: false },
  { href: "/applications", label: "Applications", icon: ClipboardList, adminOnly: false },
  { href: "/monitoring", label: "Monitoring", icon: Gauge, adminOnly: false },
  { href: "/services", label: "Services", icon: Layers, adminOnly: false },
  { href: "/document-types", label: "Document Types", icon: FileType, adminOnly: false },
  { href: "/notifications", label: "Notifications", icon: Bell, adminOnly: false },
  { href: "/reports", label: "Reports", icon: FileBarChart, adminOnly: false },
  { href: "/clients", label: "Clients", icon: Building2, adminOnly: false },
  { href: "/category", label: "Category", icon: FolderKanban, adminOnly: false },
  { href: "/departments", label: "Departments", icon: Building, adminOnly: false },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/email-template", label: "Email Template", icon: Mail, adminOnly: true },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText, adminOnly: true },
  { href: "/trash", label: "Trash", icon: Trash2, adminOnly: true },
  { href: "/profile", label: "Profile", icon: UserCircle, adminOnly: false },
];

export function MobileNav({ role }: { role: "ADMIN" | "VIEWER" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "ADMIN");

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        className="p-2 rounded hover:bg-slate-100 text-ink"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-64 bg-ink text-slate-300 flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shrink-0 p-1">
                  <SucofindoMark size={20} />
                </div>
                <div>
                  <p className="font-display font-semibold text-white text-sm leading-tight">Certificate Reminder</p>
                  <p className="font-mono text-[8px] tracking-[0.1em] text-brand-teal uppercase leading-tight mt-0.5">
                    Ensuring Quality, Protecting Trust
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Tutup menu" className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded px-3 py-2.5 text-sm",
                      active ? "bg-white/10 text-white font-medium" : "text-slate-400"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <form action="/api/auth/logout" method="POST" className="px-3 py-4 border-t border-white/10">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm text-slate-400"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </form>
          </div>
          <div className="flex-1 bg-ink/40" onClick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
