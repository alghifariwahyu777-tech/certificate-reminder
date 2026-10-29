import * as React from "react";
import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white border border-line rounded-lg shadow-card dark:bg-slate-900 dark:border-slate-700",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 pb-1 pt-4", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-bold text-ink dark:text-slate-100 text-[15px]", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

/** One line under a card title: what the card shows, or its key figure in words. */
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-0.5 text-[12.5px] leading-snug text-slate-500 dark:text-slate-400", className)} {...props} />;
}

/**
 * Standard card heading: title, optional one-line description, optional
 * action (link or small button) on the right. No icon in the title.
 */
export function CardHead({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pb-1 pt-4", className)}>
      <div className="min-w-0">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/** Empty list or table message: one plain sentence, optional next step. */
export function EmptyState({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400", className)}>
      <p>{children}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
