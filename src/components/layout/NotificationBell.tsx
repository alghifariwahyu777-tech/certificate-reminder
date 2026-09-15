"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, AlertTriangle, TimerReset } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: "EXPIRING_SOON" | "EXPIRED";
  message: string;
  status: "NEW" | "READ" | "DONE";
  createdAt: string;
  certificate: { id: string; certificateName: string; certificateNumber: string };
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications?limit=8");
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
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "READ" }),
    });
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => (n.status === "NEW" ? { ...n, status: "READ" } : n)));
    setNewCount(0);
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifikasi"
        className="relative p-2 rounded hover:bg-slate-100 text-slate-500"
      >
        <Bell className="h-4.5 w-4.5" />
        {newCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-signal-expired text-white text-[10px] font-bold flex items-center justify-center">
            {newCount > 9 ? "9+" : newCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-md shadow-panel z-50 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-ink">Notifikasi</p>
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
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => {
                const Icon = n.type === "EXPIRED" ? AlertTriangle : TimerReset;
                return (
                  <Link
                    key={n.id}
                    href={`/certificate/${n.certificate.id}`}
                    onClick={() => n.status === "NEW" && markAsRead(n.id)}
                    className={cn(
                      "flex items-start gap-2.5 px-4 py-3 hover:bg-slate-50 block",
                      n.status === "NEW" && "bg-accent/5"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        n.type === "EXPIRED" ? "text-signal-expired" : "text-signal-soon"
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-ink leading-snug">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">{n.status}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium text-accent hover:text-accent-light px-4 py-3 border-t border-slate-100"
          >
            Lihat Semua Notifikasi
          </Link>
        </div>
      )}
    </div>
  );
}
