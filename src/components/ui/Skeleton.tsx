import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}

/** A row of skeleton cells shaped like a data table row — used while list data is loading. */
export function SkeletonTableRow({ columns, showCheckbox = false }: { columns: number; showCheckbox?: boolean }) {
  return (
    <tr className="border-b border-slate-50 dark:border-slate-800 last:border-0">
      {showCheckbox && (
        <td className="px-4 py-3">
          <Skeleton className="h-4 w-4" />
        </td>
      )}
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4" style={{ width: `${55 + ((i * 17) % 40)}%` }} />
        </td>
      ))}
    </tr>
  );
}

/** A handful of skeleton rows, for dropping into a loading <tbody>. */
export function SkeletonTableRows({
  rows = 6,
  columns,
  showCheckbox = false,
}: {
  rows?: number;
  columns: number;
  showCheckbox?: boolean;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} showCheckbox={showCheckbox} />
      ))}
    </>
  );
}

/** A skeleton shaped like a simple list item (icon + two lines of text) — for card-style lists. */
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <Skeleton className="h-8 w-8 rounded shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonListItems({ items = 5 }: { items?: number }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}
