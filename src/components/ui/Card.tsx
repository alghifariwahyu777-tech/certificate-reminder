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
    <div className={cn("px-5 py-4 border-b border-slate-100 dark:border-slate-800", className)} {...props} />
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
