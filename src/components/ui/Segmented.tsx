"use client";

import { cn } from "@/lib/utils";

/** The one switch for two to four views of the same content (not page navigation). */
export function Segmented<K extends string>({ value, onChange, options, className }: { value: K; onChange: (k: K) => void; options: (readonly [K, string])[]; className?: string }) {
  return (
    <div className={cn("inline-flex shrink-0 rounded-lg bg-paper p-0.5 text-[12.5px] font-semibold dark:bg-slate-800", className)} role="tablist">
      {options.map(([k, l]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={cn("rounded-md px-3 py-1.5 transition-colors", value === k ? "bg-white text-ink shadow-card dark:bg-slate-900 dark:text-slate-100" : "text-slate-500 hover:text-ink dark:hover:text-slate-200")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
