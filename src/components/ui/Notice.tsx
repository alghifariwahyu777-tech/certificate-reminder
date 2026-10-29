import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one banner style for messages inside a page: information, warning,
 * problem or confirmation. Always the same shape and the same icon per tone.
 */
export type NoticeTone = "info" | "warning" | "danger" | "success";

const STYLE: Record<NoticeTone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: "border-[#C9DDF0] bg-[#EEF5FB] dark:border-accent/30 dark:bg-accent/10", icon: "text-accent", Icon: Info },
  warning: { box: "border-signal-soonBorder bg-signal-soonBg dark:border-signal-soon/30 dark:bg-signal-soon/10", icon: "text-signal-soon", Icon: AlertTriangle },
  danger: { box: "border-signal-expiredBorder bg-signal-expiredBg dark:border-signal-expired/30 dark:bg-signal-expired/10", icon: "text-signal-expired", Icon: XCircle },
  success: { box: "border-signal-activeBorder bg-signal-activeBg dark:border-signal-active/30 dark:bg-signal-active/10", icon: "text-signal-active", Icon: CheckCircle2 },
};

export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: NoticeTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const s = STYLE[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center", s.box, className)}>
      <div className="flex min-w-0 flex-1 gap-2.5">
        <s.Icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.icon)} aria-hidden />
        <div className="min-w-0 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
          {title && <p className="font-semibold text-ink dark:text-slate-100">{title}</p>}
          {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2 pl-6 sm:pl-0">{action}</div>}
    </div>
  );
}
