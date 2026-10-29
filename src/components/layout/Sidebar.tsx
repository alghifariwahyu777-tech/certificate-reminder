"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  ChevronsLeft,
  ChevronsRight,
  FolderClock,
  Wrench,
  Users2,
  ChevronDown,
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

const COLLAPSE_STORAGE_KEY = "sidebar-collapsed";

export function Sidebar({ role }: { role: "ADMIN" | "VIEWER" | "PIC" }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read the saved preference after mount only, so server-rendered markup
  // (which has no access to localStorage) matches the client's first
  // render — avoids a hydration mismatch warning.
  useEffect(() => {
    const saved = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (saved === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  // Collapsible groups: the group holding the current page is always open; others remember the user's choice.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sidebar-groups");
      if (saved) setOpenGroups(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);
  const groupHasActive = (g: { items: { href: string }[] }) => g.items.some((i) => isNavActive(pathname, i.href));
  const isGroupOpen = (g: { label: string | null; items: { href: string }[] }) => groupHasActive(g) || (openGroups[g.label as string] ?? false);
  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const g = NAV_GROUPS.find((x) => x.label === label);
      const next = { ...prev, [label]: !(g ? isGroupOpen(g) : false) };
      try {
        window.localStorage.setItem("sidebar-groups", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || role === "ADMIN"),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col bg-gradient-to-b from-[#1A5A8E] via-[#123F6B] to-[#0A2440] text-slate-300 h-screen shrink-0 sticky top-0 z-40 transition-[width] duration-150",
        hydrated ? (collapsed ? "md:w-[68px]" : "md:w-60") : "md:w-60"
      )}
    >
      <div className="flex items-center gap-2 pl-4 pr-5 py-5 border-b border-white/10 relative">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shrink-0 p-1">
          <SucofindoMark size={20} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display font-semibold text-white text-sm leading-tight">
              Reminder System
            </p>
            <p className="text-[11px] text-sky-200/80 leading-snug mt-0.5">
              Ensuring Quality,
              <br />
              Protecting Trust
            </p>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Perluas sidebar" : "Perkecil sidebar"}
          title={collapsed ? "Perluas sidebar" : "Perkecil sidebar"}
          className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white border-2 border-white hover:bg-[#1A5A8E] hover:text-white shadow-md transition-colors"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {groups.map((group, groupIndex) => (
          <div key={group.label || `group-${groupIndex}`} className={groupIndex > 0 ? "pt-3 mt-3 border-t border-white/10" : ""}>
            {group.label && !collapsed && (
              <button
                type="button"
                onClick={() => toggleGroup(group.label as string)}
                aria-expanded={isGroupOpen(group)}
                className="flex w-full items-center justify-between rounded-md px-3 pb-1.5 text-xs font-medium text-sky-200/60 hover:text-sky-100"
              >
                {group.label}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !isGroupOpen(group) && "-rotate-90")} />
              </button>
            )}
            {(collapsed || !group.label || isGroupOpen(group)) && group.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] transition-colors",
                    collapsed && "justify-center px-0",
                    active
                      ? "bg-white/[0.13] text-white font-semibold"
                      : "text-sky-100/75 hover:bg-white/[0.07] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="px-5 py-3 border-t border-white/10">
          <span className="stamp-badge text-slate-400 border-white/10 bg-white/5">
            {role === "ADMIN" ? "Administrator" : "Viewer"}
          </span>
        </div>
      )}

      <form action="/api/auth/logout" method="POST" className="px-3 py-4 border-t border-white/10">
        <button
          type="submit"
          title={collapsed ? "Keluar" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Keluar"}
        </button>
      </form>
    </aside>
  );
}
