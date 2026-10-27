"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

/** Fill or clear the demo projects ("DEMO-…"), so the module can be tried before real data is entered. */
export function DemoDataButton({ hasDemo }: { hasDemo: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/demo", { method: hasDemo ? "DELETE" : "POST" });
      if (!res.ok) return setError("Gagal memproses data contoh. Coba lagi.");
      showToast(hasDemo ? "Data contoh dihapus." : "Data contoh berhasil ditambahkan.");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {hasDemo ? <Trash2 className="h-4 w-4" /> : <Database className="h-4 w-4" />}
        {hasDemo ? "Hapus data contoh" : "Isi data contoh"}
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={hasDemo ? "Hapus data contoh?" : "Isi data contoh?"}>
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          {hasDemo ? (
            <p>Semua project bernomor DEMO-…, personil contoh, dan riwayatnya akan dihapus. Data project asli tidak tersentuh.</p>
          ) : (
            <p>
              Sistem akan menambahkan 8 project contoh (nomor DEMO-01 s.d. DEMO-08) lengkap dengan RAB, progres, termin, biaya, kendala, tim, dan riwayat 6 minggu, agar
              seluruh fitur dapat dicoba. Data contoh dapat dihapus kapan saja dengan satu klik dan tidak mengubah data asli.
            </p>
          )}
          {error && <p className="text-signal-expired">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button variant={hasDemo ? "danger" : "primary"} isLoading={busy} onClick={run}>
              {hasDemo ? "Hapus data contoh" : "Isi data contoh"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
