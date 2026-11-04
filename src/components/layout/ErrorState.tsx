"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, TriangleAlert } from "lucide-react";

/**
 * Shown when a page fails to load. Most failures are momentary (a dropped
 * database connection, or an old browser tab asking for files from a previous
 * version after an update), so the page first retries on its own once; the
 * person only sees the message if the retry fails too.
 */

const KEY = "rs-auto-retry";

function isStaleBundle(e: Error) {
  return e.name === "ChunkLoadError" || /loading (css )?chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(e.message);
}

export function ErrorState({ error, reset, home = "/dashboard" }: { error: Error & { digest?: string }; reset: () => void; home?: string }) {
  const [retrying, setRetrying] = useState(true);
  const router = useRouter();
  // a server-side failure is only cleared by asking the server again, then re-rendering
  const retry = useCallback(() => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }, [router, reset]);

  useEffect(() => {
    console.error(error);
    // an update was deployed while this tab was open: a full reload fetches the new files
    if (isStaleBundle(error)) {
      window.location.reload();
      return;
    }
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(KEY) || 0);
    } catch {}
    // one silent retry per 20 seconds, so a real fault can never loop
    if (Date.now() - last > 20_000) {
      try {
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch {}
      const t = setTimeout(retry, 700);
      return () => clearTimeout(t);
    }
    setRetrying(false);
  }, [error, retry]);

  if (retrying) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-slate-500" aria-live="polite">
        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
        Memuat ulang
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-12">
      <div className="max-w-md rounded-xl border border-line bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#FBF3E4] text-signal-soon">
          <TriangleAlert className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="text-[17px] font-bold text-ink dark:text-slate-100">Halaman belum bisa dimuat</h1>
        <p className="mt-1.5 text-[13.5px] text-slate-600 dark:text-slate-300">
          Biasanya karena koneksi ke database terputus sebentar. Data Anda aman. Coba muat lagi; bila masih gagal, hubungi Administrator.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRetrying(true);
              retry();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blueDark px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Muat ulang
          </button>
          <Link href={home} className="rounded-lg border border-line px-4 py-2 text-[13px] font-semibold text-ink hover:bg-paper dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Ke dasbor
          </Link>
        </div>
        {error.digest && <p className="mt-4 text-[11px] text-slate-400">Kode: {error.digest}</p>}
      </div>
    </div>
  );
}
