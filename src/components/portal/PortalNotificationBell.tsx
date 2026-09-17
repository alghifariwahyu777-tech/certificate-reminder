"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: "APP_REVISION_REQUIRED" | "APP_APPROVED" | "APP_CERTIFICATE_ISSUED";
  message: string;
  status: "NEW" | "READ" | "DONE";
  createdAt: string;
  application: { id: string; applicationNumber: string } | null;
};

export function PortalNotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/portal/notifications?limit=8");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setNewCount(data.newCount || 0);
    } catch {
      /* silent — bell just stays empty on failure */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n)));
    setNewCount((prev) => Math.max(0, prev - 1));
    await fetch(`/api/portal/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "READ" }),
    });
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => (n.status === "NEW" ? { ...n, status: "READ" } : n)));
    setNewCount(0);
    await fetch("/api/portal/notifications/mark-all-read", { method: "POST" });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifikasi"
        className="relative p-2 rounded hover:bg-white/10 text-slate-300 hover:text-white"
      >
        <Bell className="h-4.5 w-4.5" />
        {newCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-signal-expired text-white text-[10px] font-bold flex items-center justify-center">
            {newCount > 9 ? "9+" : newCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-panel z-50 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-ink dark:text-slate-100">Notifikasi</p>
            {newCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-accent hover:text-accent-light flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Tandai semua dibaca
              </button>
            )}
          </div>

          {loading ? (
            <p className="px-4 py-8 text-center text-xs text-slate-400">Memuat...</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-slate-400">Tidak ada notifikasi.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.application ? `/portal/applications/${n.application.id}` : "/portal"}
                  onClick={() => n.status === "NEW" && markAsRead(n.id)}
                  className={cn(
                    "flex items-start gap-2.5 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 block",
                    n.status === "NEW" && "bg-accent/5"
                  )}
                >
                  <ClipboardList className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="text-xs text-ink dark:text-slate-100 leading-snug">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">{n.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
