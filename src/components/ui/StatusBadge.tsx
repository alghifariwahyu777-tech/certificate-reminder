import { getCertificateStatus, STATUS_CLASSES, STATUS_DOT, STATUS_LABEL } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusBadge({ expiryDate }: { expiryDate: Date | string }) {
  const status = getCertificateStatus(expiryDate);
  return (
    <span className={cn("stamp-badge", STATUS_CLASSES[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}
