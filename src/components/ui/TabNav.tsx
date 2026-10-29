"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The one tab bar used across the app: underlined, optional data-type icon, optional red count. */
export function TabNav<K extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: readonly { key: K; label: string; badge?: number; icon?: LucideIcon }[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("no-scrollbar -mx-1 flex overflow-x-auto overflow-y-hidden border-b border-line px-1 dark:border-slate-800", className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-current={value === t.key ? "page" : undefined}
          onClick={() => onChange(t.key)}
          className={cn(
            "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors",
            value === t.key
              ? "border-brand-blueDark text-brand-blueDark dark:border-slate-100 dark:text-slate-100"
              : "border-transparent text-slate-500 hover:text-ink dark:hover:text-slate-200"
          )}
        >
          {t.icon && <t.icon className="h-4 w-4" aria-hidden />}
          {t.label}
          {!!t.badge && <span className="rounded-full bg-signal-expired px-1.5 py-0.5 text-[10px] leading-none text-white">{t.badge}</span>}
        </button>
      ))}
    </nav>
  );
}
