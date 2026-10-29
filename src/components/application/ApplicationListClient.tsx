"use client";

import { SearchPopoverButton } from "@/components/ui/SearchPopoverButton";
import { filterGroupClass, toolbarClass } from "@/components/ui/Toolbar";
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
      <div className={toolbarClass}>
        <div className={filterGroupClass}>
          <div>
            <SearchPopoverButton value={search} onChange={setSearch} label="Cari permohonan" placeholder="Nomor, klien, atau layanan..." />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Semua status</option>
            {Object.entries(APPLICATION_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="th-row">
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
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
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
