import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one key-figure card used on every page: label on top, the figure,
 * then one line of context. Colour only on the figure, and only when it
 * carries meaning (good / warning / bad). Every key figure carries
 * an icon in the same place, tinted with the same tone as its figure.
 */
export type StatTone = "default" | "good" | "warn" | "bad" | "accent";

const ICON_TONE: Record<StatTone, string> = {
  default: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  good: "border-signal-activeBorder bg-signal-activeBg text-signal-active dark:border-signal-active/30 dark:bg-signal-active/10",
  warn: "border-signal-soonBorder bg-signal-soonBg text-signal-soon dark:border-signal-soon/30 dark:bg-signal-soon/10",
  bad: "border-signal-expiredBorder bg-signal-expiredBg text-signal-expired dark:border-signal-expired/30 dark:bg-signal-expired/10",
  accent: "border-[#C9DDF0] bg-[#EEF5FB] text-accent dark:border-accent/30 dark:bg-accent/10",
};

const TONE: Record<StatTone, string> = {
  default: "text-ink dark:text-slate-100",
  good: "text-signal-active",
  warn: "text-signal-soon",
  bad: "text-signal-expired",
  accent: "text-accent",
};

export function StatGrid({ children, cols = 4, className }: { children: React.ReactNode; cols?: 3 | 4 | 5; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 md:gap-4",
        cols === 3 && "lg:grid-cols-3",
        cols === 4 && "xl:grid-cols-4",
        cols === 5 && "lg:grid-cols-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  hint,
  tone = "default",
  icon: Icon,
  href,
  children,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  hint?: string;
  tone?: StatTone;
  href?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-[12.5px] font-medium leading-snug text-slate-500 dark:text-slate-400" title={hint}>
          {label}
        </p>
        {Icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", ICON_TONE[tone])} aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={cn(Icon ? "-mt-1" : "mt-1", "truncate text-[22px] font-bold leading-tight tabular-nums sm:text-[26px]", TONE[tone])}>{value}</p>
      {children}
      {sub !== undefined && sub !== null && sub !== "" && (
        <p className={cn("text-[12px] leading-snug text-slate-500 dark:text-slate-400", children ? "mt-0.5" : "mt-1.5")}>{sub}</p>
      )}
    </>
  );
  const cls = cn(
    "block min-w-0 rounded-lg border border-line bg-white px-4 py-3.5 shadow-card sm:px-5 sm:py-4 dark:border-slate-700 dark:bg-slate-900",
    href && "transition-colors hover:border-slate-300 dark:hover:border-slate-500",
    className
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
