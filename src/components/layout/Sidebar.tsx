"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SucofindoMark } from "@/components/brand/SucofindoLogo";

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
      { href: "/applications", label: "Applications", icon: ClipboardList, adminOnly: false },
      { href: "/departments", label: "Departments", icon: Building, adminOnly: false },
    ],
  },
  {
    label: "Personnel",
    items: [
      { href: "/employees", label: "Employees", icon: UserSquare2, adminOnly: false },
      { href: "/personnel-certifications", label: "Certifications", icon: Award, adminOnly: false },
      { href: "/personnel-categories", label: "Categories", icon: Tags, adminOnly: false },
      { href: "/personnel-email-template", label: "Email Template", icon: Mail, adminOnly: true },
    ],
  },
  {
    label: "Client",
    items: [
      { href: "/certificate", label: "Certificate", icon: FileBadge2, adminOnly: false },
      { href: "/monitoring", label: "Monitoring", icon: Gauge, adminOnly: false },
      { href: "/services", label: "Services", icon: Layers, adminOnly: false },
      { href: "/document-types", label: "Document Types", icon: FileType, adminOnly: false },
      { href: "/clients", label: "Clients", icon: Building2, adminOnly: false },
      { href: "/category", label: "Category", icon: Tags, adminOnly: false },
      { href: "/email-template", label: "Email Template", icon: Mail, adminOnly: true },
    ],
  },
  {
    label: "Project",
    items: [
      { href: "/projects", label: "Project Monitoring", icon: FolderClock, adminOnly: false },
      { href: "/project-categories", label: "Categories", icon: Tags, adminOnly: false },
      { href: "/project-email-template", label: "Email Template", icon: Mail, adminOnly: true },
    ],
  },
  {
    label: "Equipment",
    items: [
      { href: "/equipment", label: "Equipment Calibration", icon: Wrench, adminOnly: false },
      { href: "/equipment-categories", label: "Categories", icon: Tags, adminOnly: false },
      { href: "/equipment-email-template", label: "Email Template", icon: Mail, adminOnly: true },
    ],
  },
  {
    label: null,
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell, adminOnly: false },
      { href: "/reports", label: "Reports", icon: FileBarChart, adminOnly: false },
      { href: "/users", label: "Users", icon: Users, adminOnly: true },
      { href: "/supervisors", label: "Supervisors", icon: Users2, adminOnly: true },
      { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
      { href: "/audit-log", label: "Audit Log", icon: ScrollText, adminOnly: true },
      { href: "/trash", label: "Trash", icon: Trash2, adminOnly: true },
      { href: "/profile", label: "Profile", icon: UserCircle, adminOnly: false },
    ],
  },
];

const COLLAPSE_STORAGE_KEY = "sidebar-collapsed";

export function Sidebar({ role }: { role: "ADMIN" | "VIEWER" }) {
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
        "hidden md:flex md:flex-col bg-ink text-slate-300 h-screen shrink-0 sticky top-0 z-20 transition-[width] duration-150",
        hydrated ? (collapsed ? "md:w-[68px]" : "md:w-60") : "md:w-60"
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10 relative">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shrink-0 p-1">
          <SucofindoMark size={20} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display font-semibold text-white text-sm leading-tight">
              Reminder System
            </p>
            <p className="font-mono text-[9px] tracking-[0.1em] text-brand-teal uppercase leading-tight mt-0.5">
              Ensuring Quality, Protecting Trust
            </p>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Perluas sidebar" : "Perkecil sidebar"}
          title={collapsed ? "Perluas sidebar" : "Perkecil sidebar"}
          className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-200 border-2 border-ink hover:bg-slate-600 hover:text-white shadow-md transition-colors"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {groups.map((group, groupIndex) => (
          <div key={group.label || `group-${groupIndex}`} className={groupIndex > 0 ? "pt-3 mt-3 border-t border-white/10" : ""}>
            {group.label && !collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-slate-500">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors",
                    collapsed && "justify-center px-0",
                    active
                      ? "bg-white/10 text-white font-medium"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
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
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Logout"}
        </button>
      </form>
    </aside>
  );
}
