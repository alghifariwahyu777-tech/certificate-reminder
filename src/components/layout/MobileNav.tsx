"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  TrendingUp,
  Network,
  FileBadge2,
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
  UserSquare2,
  Award,
  Tags,
  Settings,
  LogOut,
  FolderClock,
  Wrench,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_ICON } from "@/lib/entity-icons";
import { SucofindoMark } from "@/components/brand/SucofindoLogo";

const ALL_NAV_HREFS = () => NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));

/** Exact match, or the longest nav href that prefixes the path (so /projects/dashboard doesn't also light up /projects). */
function isNavActive(rawPath: string, href: string) {
  // a single project's page belongs to "Monitoring Project" (its back link goes there), not to the list
  const m = rawPath?.match(/^\/projects\/([^/]+)/);
  const pathname = m && !["new", "dashboard", "personnel", "weekly-report"].includes(m[1]) && !rawPath.endsWith("/edit") ? "/projects/dashboard" : rawPath;
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  return !ALL_NAV_HREFS().some((other) => other.length > href.length && (pathname === other || pathname.startsWith(other + "/")));
}

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dasbor", icon: PAGE_ICON["/dashboard"], adminOnly: false },
      { href: "/applications", label: "Permohonan", icon: PAGE_ICON["/applications"], adminOnly: false },
    ],
  },
  {
    label: "Personil",
    items: [
      { href: "/employees", label: "Karyawan", icon: PAGE_ICON["/employees"], adminOnly: false },
      { href: "/personnel-certifications", label: "Sertifikasi", icon: PAGE_ICON["/personnel-certifications"], adminOnly: false },
      { href: "/personnel-categories", label: "Kategori", icon: PAGE_ICON["/personnel-categories"], adminOnly: false },
      { href: "/personnel-email-template", label: "Template Email", icon: PAGE_ICON["/personnel-email-template"], adminOnly: true },
    ],
  },
  {
    label: "Klien",
    items: [
      { href: "/certificate", label: "Sertifikat", icon: PAGE_ICON["/certificate"], adminOnly: false },
      { href: "/monitoring", label: "Monitoring Permohonan", icon: PAGE_ICON["/monitoring"], adminOnly: false },
      { href: "/services", label: "Layanan", icon: PAGE_ICON["/services"], adminOnly: false },
      { href: "/document-types", label: "Jenis Dokumen", icon: PAGE_ICON["/document-types"], adminOnly: false },
      { href: "/clients", label: "Daftar Klien", icon: PAGE_ICON["/clients"], adminOnly: false },
      { href: "/category", label: "Kategori", icon: PAGE_ICON["/category"], adminOnly: false },
      { href: "/email-template", label: "Template Email", icon: PAGE_ICON["/email-template"], adminOnly: true },
    ],
  },
  {
    label: "Project",
    items: [
      { href: "/projects/dashboard", label: "Monitoring Project", icon: PAGE_ICON["/projects/dashboard"], adminOnly: false },
      { href: "/projects", label: "Daftar Project", icon: PAGE_ICON["/projects"], adminOnly: false },
      { href: "/projects/personnel", label: "Penugasan Personil", icon: PAGE_ICON["/projects/personnel"], adminOnly: false },
      { href: "/projects/weekly-report", label: "Laporan Mingguan", icon: PAGE_ICON["/projects/weekly-report"], adminOnly: false },
      { href: "/project-categories", label: "Kategori", icon: PAGE_ICON["/project-categories"], adminOnly: false },
      { href: "/project-email-template", label: "Template Email", icon: PAGE_ICON["/project-email-template"], adminOnly: true },
    ],
  },
  {
    label: "Peralatan",
    items: [
      { href: "/equipment", label: "Kalibrasi Alat", icon: PAGE_ICON["/equipment"], adminOnly: false },
      { href: "/equipment-categories", label: "Kategori", icon: PAGE_ICON["/equipment-categories"], adminOnly: false },
      { href: "/equipment-email-template", label: "Template Email", icon: PAGE_ICON["/equipment-email-template"], adminOnly: true },
    ],
  },
  {
    label: null,
    items: [
      { href: "/notifications", label: "Notifikasi", icon: PAGE_ICON["/notifications"], adminOnly: false },
      { href: "/reports", label: "Laporan", icon: PAGE_ICON["/reports"], adminOnly: false },
      { href: "/users", label: "Pengguna", icon: PAGE_ICON["/users"], adminOnly: true },
      { href: "/supervisors", label: "Atasan", icon: PAGE_ICON["/supervisors"], adminOnly: true },
      { href: "/departments", label: "Divisi", icon: PAGE_ICON["/departments"], adminOnly: false },
      { href: "/settings", label: "Pengaturan", icon: PAGE_ICON["/settings"], adminOnly: true },
      { href: "/audit-log", label: "Log Audit", icon: PAGE_ICON["/audit-log"], adminOnly: true },
      { href: "/trash", label: "Sampah", icon: PAGE_ICON["/trash"], adminOnly: true },
      { href: "/profile", label: "Profil", icon: PAGE_ICON["/profile"], adminOnly: false },
    ],
  },
];

export function MobileNav({ role }: { role: "ADMIN" | "VIEWER" | "PIC" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || role === "ADMIN"),
  })).filter((group) => group.items.length > 0);

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
          <div className="w-64 bg-gradient-to-b from-[#1A5A8E] via-[#123F6B] to-[#0A2440] text-slate-300 flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shrink-0 p-1">
                  <SucofindoMark size={20} />
                </div>
                <div>
                  <p className="font-display font-semibold text-white text-sm leading-tight">Reminder System</p>
                  <p className="text-[11px] text-sky-200/80 leading-snug mt-0.5">
                    Ensuring Quality,
                    <br />
                    Protecting Trust
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Tutup menu" className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {groups.map((group, groupIndex) => (
                <div key={group.label || `group-${groupIndex}`} className={groupIndex > 0 ? "pt-3 mt-3 border-t border-white/10" : ""}>
                  {group.label && (
                    <p className="px-3 pb-1.5 text-xs font-medium text-sky-200/60">
                      {group.label}
                    </p>
                  )}
                  {group.items.map((item) => {
                    const active = isNavActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded px-3 py-2.5 text-sm",
                          active ? "bg-white/[0.13] text-white font-semibold" : "text-sky-100/75"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <form action="/api/auth/logout" method="POST" className="px-3 py-4 border-t border-white/10">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm text-slate-400"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </form>
          </div>
          <div className="flex-1 bg-ink/40" onClick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
