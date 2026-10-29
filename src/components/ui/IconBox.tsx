import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Data-type marker: the same small navy-tinted square everywhere a kind of data is identified by its icon. */
export function IconBox({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C9DDF0] bg-[#EEF5FB] text-brand-blueDark dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
        className
      )}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
