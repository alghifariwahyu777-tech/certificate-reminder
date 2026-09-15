"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from "@/lib/application";

type ApplicationItem = {
  id: string;
  applicationNumber: string;
  clientName: string;
  serviceName: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
};

export function ApplicationListClient({ initialApplications }: { initialApplications: ApplicationItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialApplications.filter((a) => {
      const matchesSearch =
        !q ||
        a.applicationNumber.toLowerCase().includes(q) ||
        a.clientName.toLowerCase().includes(q) ||
        a.serviceName.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [initialApplications, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari nomor, klien, atau layanan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-56">
          <option value="">Semua Status</option>
          {Object.entries(APPLICATION_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 font-medium">Nomor</th>
                <th className="px-4 py-3 font-medium">Klien</th>
                <th className="px-4 py-3 font-medium">Layanan</th>
                <th className="px-4 py-3 font-medium">Diajukan</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    Tidak ada permohonan yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/applications/${a.id}`} className="font-mono text-xs text-accent hover:text-accent-light">
                        {a.applicationNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">{a.clientName}</td>
                    <td className="px-4 py-3 text-slate-600">{a.serviceName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.submittedAt ? formatDate(a.submittedAt) : formatDate(a.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`stamp-badge ${APPLICATION_STATUS_COLORS[a.status]}`}>
                        {APPLICATION_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
