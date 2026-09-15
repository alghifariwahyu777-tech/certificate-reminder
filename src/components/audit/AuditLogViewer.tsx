"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Upload,
  RefreshCw,
  Send,
} from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonListItems } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

type AuditLogItem = {
  id: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  createdAt: string;
};

const ACTION_ICONS: Record<string, typeof LogIn> = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  UPLOAD: Upload,
  RENEW: RefreshCw,
  SEND_REMINDER: Send,
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
  LOGOUT: "text-slate-500 bg-slate-100 border-slate-200",
  CREATE: "text-signal-active bg-signal-activeBg border-signal-activeBorder",
  UPDATE: "text-accent bg-accent/5 border-accent/20",
  DELETE: "text-signal-expired bg-signal-expiredBg border-signal-expiredBorder",
  UPLOAD: "text-accent bg-accent/5 border-accent/20",
  RENEW: "text-signal-soon bg-signal-soonBg border-signal-soonBorder",
  SEND_REMINDER: "text-ink bg-ink/5 border-ink/10",
};

const ENTITY_TYPES = ["Certificate", "Category", "Department", "Client", "User", "Renewal", "Auth", "Reminder"];
const ACTIONS = ["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "UPLOAD", "RENEW", "SEND_REMINDER"];

export function AuditLogViewer() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, action, entityType]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search: debouncedSearch,
      action,
      entityType,
      page: String(page),
      pageSize: "20",
    });
    try {
      const res = await fetch(`/api/audit-log?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination || null);
    } catch {
      showToast("Gagal memuat audit log.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, action, entityType, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari pengguna atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="sm:w-48">
          <option value="">Semua Aksi</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="sm:w-48">
          <option value="">Semua Entitas</option>
          {ENTITY_TYPES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {loading ? (
          <SkeletonListItems items={8} />
        ) : logs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">Tidak ada aktivitas yang cocok.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const Icon = ACTION_ICONS[log.action] || Pencil;
              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div
                    className={`h-8 w-8 rounded flex items-center justify-center border shrink-0 ${
                      ACTION_COLORS[log.action] || "text-slate-500 bg-slate-100 border-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{log.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {log.userName} · {log.entityType} ·{" "}
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>{pagination.total} aktivitas tercatat</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
