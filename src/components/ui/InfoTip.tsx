"use client";

import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const WIDTH = 300;
const GAP = 8;
const MARGIN = 12;

/**
 * A small (?) button that shows an explanation only when clicked, so screens
 * carry figures rather than paragraphs. The explanation opens in a layer above
 * the page and is kept inside the screen, so it is never cut off by a card or
 * a chart. `guide` adds a link to the matching section of the Panduan page.
 * Closes on outside click, scroll or Escape.
 */
export function InfoTip({
  children,
  label = "Keterangan",
  guide,
  className,
}: {
  children: ReactNode;
  label?: string;
  /** anchor on the Panduan page, e.g. "proyeksi-margin" */
  guide?: string;
  /** kept for compatibility; placement is now automatic */
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const b = btn.current?.getBoundingClientRect();
    if (!b) return;
    const w = Math.min(WIDTH, window.innerWidth - MARGIN * 2);
    const h = pop.current?.offsetHeight ?? 160;
    const left = Math.min(Math.max(MARGIN, b.left + b.width / 2 - w / 2), window.innerWidth - w - MARGIN);
    const below = b.bottom + GAP + h <= window.innerHeight - MARGIN || b.top - GAP - h < MARGIN;
    setPos({ left, top: below ? b.bottom + GAP : b.top - GAP - h, above: !below });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <span className={cn("inline-flex align-middle", className)}>
      <button
        ref={btn}
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
        <HelpCircle className="h-4 w-4" />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={pop}
            role="tooltip"
            style={{ position: "fixed", left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: Math.min(WIDTH, typeof window !== "undefined" ? window.innerWidth - MARGIN * 2 : WIDTH) }}
            className="z-[100] rounded-lg border border-line bg-white p-3 text-left text-[12.5px] font-normal normal-case leading-relaxed text-slate-600 shadow-panel dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
            {guide && (
              <Link href={`/guide#${guide}`} className="mt-2 block font-semibold text-accent hover:underline" onClick={() => setOpen(false)}>
                Baca panduan lengkap
              </Link>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}
