"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Fills the remaining demo projects in short API steps, then reloads the page data. */
export function DemoSeeder({ present, total }: { present: number; total: number }) {
  const router = useRouter();
  const [count, setCount] = useState(present);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      for (let i = 0; i < 10; i++) {
        const res = await fetch("/api/projects/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "auto" }) }).catch(() => null);
        const data = res ? await res.json().catch(() => null) : null;
        if (!res || !res.ok) {
          setError(data?.message || "Data contoh gagal dibuat. Muat ulang halaman untuk mencoba lagi.");
          return;
        }
        if (typeof data?.present === "number") setCount(data.present);
        router.refresh();
        if (data?.done) return;
      }
    })();
  }, [router]);

  if (error) return <div className="rounded-lg border border-signal-expiredBorder bg-signal-expiredBg px-4 py-2.5 text-[13px] text-signal-expired">{error}</div>;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-[13px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <Loader2 className="h-4 w-4 animate-spin text-accent" />
      Menyiapkan data contoh ({count} dari {total} project)…
    </div>
  );
}
