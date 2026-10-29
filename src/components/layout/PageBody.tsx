import { cn } from "@/lib/utils";

/**
 * Page content area. Two widths only, used the same way everywhere:
 * - "full": lists, dashboards and master data (the default)
 * - "form": forms, detail pages and settings, kept to a readable width
 */
export function PageBody({ width = "full", className, children }: { width?: "full" | "form"; className?: string; children: React.ReactNode }) {
  return <div className={cn("space-y-6 p-5 md:p-8", width === "form" && "max-w-4xl", className)}>{children}</div>;
}
