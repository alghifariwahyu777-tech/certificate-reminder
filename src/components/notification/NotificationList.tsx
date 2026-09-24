"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, TimerReset, ClipboardList, CheckCheck, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonListItems } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn, formatDate } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: "EXPIRING_SOON" | "EXPIRED" | "APP_SUBMITTED" | "APP_REVISION_REQUIRED" | "APP_APPROVED" | "APP_CERTIFICATE_ISSUED";
  message: string;
  status: "NEW" | "READ" | "DONE";
  createdAt: string;
  certificate: { id: string; certificateName: string; certificateNumber: string } | null;
  personnelCertification: { id: string; certificationName: string; certificationNumber: string | null } | null;
  project: { id: string; projectName: string; projectNumber: string } | null;
  equipment: { id: string; name: string; assetNumber: string | null } | null;
  application: { id: string; applicationNumber: string } | null;
};

function iconFor(type: NotificationItem["type"]) {
  if (type === "EXPIRED") return { Icon: AlertTriangle, color: "text-signal-expired" };
  if (type === "EXPIRING_SOON") return { Icon: TimerReset, color: "text-signal-soon" };
  return { Icon: ClipboardList, color: "text-accent" };
}

function linkFor(n: NotificationItem) {
  if (n.certificate) return `/certificate/${n.certificate.id}`;
  if (n.personnelCertification) return `/personnel-certifications/${n.personnelCertification.id}`;
  if (n.project) return `/projects/${n.project.id}`;
  if (n.equipment) return `/equipment/${n.equipment.id}`;
  if (n.application) return `/applications/${n.application.id}`;
  return "/notifications";
}

function refFor(n: NotificationItem) {
  return (
    n.certificate?.certificateNumber ||
    n.personnelCertification?.certificationNumber ||
    n.project?.projectNumber ||
    n.equipment?.assetNumber ||
    n.application?.applicationNumber ||
    ""
  );
}

const TABS: { value: string; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "NEW", label: "Baru" },
  { value: "READ", label: "Sudah Dibaca" },
  { value: "DONE", label: "Selesai Ditindaklanjuti" },
];

export function NotificationList() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (tab) params.set("status", tab);
      const res = await fetch(`/api/notifications?${params.toString()}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      showToast("Gagal memuat notifikasi.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function updateStatus(id: string, status: "READ" | "DONE") {
    setNotifications((prev) =>
      tab && status !== tab
        ? prev.filter((n) => n.id !== id)
        : prev.map((n) => (n.id === id ? { ...n, status } : n))
    );
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    showToast(status === "DONE" ? "Ditandai selesai ditindaklanjuti." : "Ditandai sudah dibaca.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium border transition-colors",
              tab === t.value
                ? "bg-ink text-white border-ink"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <SkeletonListItems items={6} />
        ) : notifications.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">Tidak ada notifikasi pada kategori ini.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const { Icon, color } = iconFor(n.type);
              return (
                <div key={n.id} className="flex items-start gap-3 px-5 py-4">
                  <Icon className={cn("h-4.5 w-4.5 mt-0.5 shrink-0", color)} />
                  <div className="min-w-0 flex-1">
                    <Link href={linkFor(n)} className="text-sm text-ink hover:text-accent">
                      {n.message}
                    </Link>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      {refFor(n)} · {formatDate(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "stamp-badge",
                        n.status === "NEW" && "text-accent bg-accent/5 border-accent/20",
                        n.status === "READ" && "text-slate-500 bg-slate-100 border-slate-200",
                        n.status === "DONE" && "text-signal-active bg-signal-activeBg border-signal-activeBorder"
                      )}
                    >
                      {n.status === "NEW" ? "Baru" : n.status === "READ" ? "Dibaca" : "Selesai"}
                    </span>
                    {n.status !== "DONE" && (
                      <>
                        {n.status === "NEW" && (
                          <Button variant="outline" size="sm" onClick={() => updateStatus(n.id, "READ")}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => updateStatus(n.id, "DONE")}>
                          <CheckCheck className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
