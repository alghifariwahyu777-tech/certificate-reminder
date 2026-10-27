"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small (i) button that shows an explanation only when clicked, so screens
 * carry figures rather than paragraphs. Closes on outside click or Escape.
 */
export function InfoTip({ children, label = "Keterangan", align = "left", className }: { children: ReactNode; label?: string; align?: "left" | "right" | "center"; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className={cn("relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn("inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-slate-400 transition-colors hover:text-accent", open && "text-accent")}
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <span
          role="tooltip"
          className={cn(
            "absolute top-full z-50 mt-2 block w-72 max-w-[80vw] rounded-lg border border-line bg-white p-3 text-left text-[12.5px] font-normal normal-case leading-relaxed text-slate-600 shadow-panel dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            align === "left" && "left-0",
            align === "right" && "right-0",
            align === "center" && "left-1/2 -translate-x-1/2"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </span>
      )}
    </span>
  );
}
