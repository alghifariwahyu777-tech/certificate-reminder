"use client";

import { useMemo, useState } from "react";
import { Search, Download, Eye } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

type PortalCertificate = {
  id: string;
  certificateNumber: string;
  certificateName: string;
  categoryName: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string | null;
};

export function PortalCertificateList({ certificates }: { certificates: PortalCertificate[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter(
      (c) =>
        c.certificateName.toLowerCase().includes(q) ||
        c.certificateNumber.toLowerCase().includes(q) ||
        c.categoryName.toLowerCase().includes(q)
    );
  }, [certificates, search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Cari nama atau nomor sertifikat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <th className="px-4 py-3 font-medium">Nomor</th>
                <th className="px-4 py-3 font-medium">Nama Sertifikat</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Terbit</th>
                <th className="px-4 py-3 font-medium">Berakhir</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Dokumen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Tidak ada sertifikat yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {c.certificateNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink dark:text-slate-100">{c.certificateName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.categoryName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(c.issueDate)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(c.expiryDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge expiryDate={c.expiryDate} />
                    </td>
                    <td className="px-4 py-3">
                      {c.fileUrl ? (
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={c.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-accent"
                            aria-label="Lihat dokumen"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                          <a
                            href={`${c.fileUrl}?download=1`}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-accent"
                            aria-label="Download dokumen"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 block text-right">Belum ada</span>
                      )}
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
