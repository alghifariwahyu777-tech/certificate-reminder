import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "PERMANENT_DELETE"
  | "UPLOAD"
  | "RENEW"
  | "SEND_REMINDER";

export type AuditEntityType =
  | "Certificate"
  | "Category"
  | "Department"
  | "Client"
  | "User"
  | "Renewal"
  | "Auth"
  | "Reminder"
  | "Service"
  | "Application";

/**
 * Fire-and-forget audit trail write. Never throws — a logging failure
 * should not break the request that triggered it, so errors are swallowed
 * (and printed to the server console for visibility during development).
 */
export async function logAudit(params: {
  userId?: string | null;
  userName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  description: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        userName: params.userName,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        description: params.description,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
