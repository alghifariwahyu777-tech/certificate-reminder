import type { CertificateInput } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

/**
 * Converts raw form input (all strings, optional fields possibly "") into a
 * Prisma-safe payload: dates parsed, empty optional strings turned into null
 * so they clear out previous values on update instead of being ignored.
 */
export function normalizeCertificatePayload(
  data: CertificateInput
): Omit<Prisma.CertificateUncheckedCreateInput, "id" | "createdAt" | "updatedAt"> {
  return {
    certificateNumber: data.certificateNumber,
    certificateName: data.certificateName,
    categoryId: data.categoryId,
    clientId: data.clientId,
    departmentId: data.departmentId || null,
    issuingBody: data.issuingBody || null,
    issueDate: new Date(data.issueDate),
    validFrom: data.validFrom ? new Date(data.validFrom) : null,
    expiryDate: new Date(data.expiryDate),
    storageLocation: data.storageLocation || null,
    pic: data.pic,
    picEmail: data.picEmail || null,
    ccEmail: data.ccEmail || null,
    description: data.description || null,
    notes: data.notes || null,
    fileUrl: data.fileUrl || null,
    driveFileId: data.driveFileId || null,
    fileMimeType: data.fileMimeType || null,
  };
}
