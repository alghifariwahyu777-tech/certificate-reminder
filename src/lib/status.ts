export type CertificateStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_WINDOW_DAYS = 30;

/**
 * Status is always derived from expiryDate — never persisted.
 * - ACTIVE: more than 30 days remain until expiry
 * - EXPIRING_SOON: expiry is within the next 30 days (inclusive), not yet passed
 * - EXPIRED: expiry date has passed
 */
export function getCertificateStatus(expiryDate: Date | string): CertificateStatus {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.round((expiry.getTime() - today.getTime()) / DAY_MS);

  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= REMINDER_WINDOW_DAYS) return "EXPIRING_SOON";
  return "ACTIVE";
}

export function getDaysRemaining(expiryDate: Date | string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / DAY_MS);
}

export const STATUS_LABEL: Record<CertificateStatus, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring Soon",
  EXPIRED: "Expired",
};

export const STATUS_CLASSES: Record<CertificateStatus, string> = {
  ACTIVE:
    "text-signal-active bg-signal-activeBg border-signal-activeBorder dark:bg-signal-active/10 dark:border-signal-active/30",
  EXPIRING_SOON:
    "text-signal-soon bg-signal-soonBg border-signal-soonBorder dark:bg-signal-soon/10 dark:border-signal-soon/30",
  EXPIRED:
    "text-signal-expired bg-signal-expiredBg border-signal-expiredBorder dark:bg-signal-expired/10 dark:border-signal-expired/30",
};

export const STATUS_DOT: Record<CertificateStatus, string> = {
  ACTIVE: "bg-signal-active",
  EXPIRING_SOON: "bg-signal-soon",
  EXPIRED: "bg-signal-expired",
};
