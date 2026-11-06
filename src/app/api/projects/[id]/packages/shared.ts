import { NextResponse } from "next/server";
import { projectPackageSchema, type ProjectPackageInput } from "@/lib/validations";

export const parsePackage = async (request: Request) => {
  const parsed = projectPackageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return { error: NextResponse.json({ message: parsed.error.errors[0]?.message || "Data tidak valid." }, { status: 400 }) } as const;
  return { data: parsed.data } as const;
};

const day = (v: string | null | undefined) => (v ? new Date(`${v.slice(0, 10)}T00:00:00.000Z`) : null);

export function packageData(v: ProjectPackageInput) {
  const fileUrl = v.fileUrl && v.fileUrl.startsWith("/api/files/") ? v.fileUrl : null;
  return {
    name: v.name,
    docType: v.docType,
    docNumber: v.docNumber?.trim() || null,
    issueDate: day(v.issueDate),
    value: v.value,
    startDate: day(v.startDate),
    endDate: day(v.endDate) as Date,
    status: v.status,
    actualEndDate: v.status === "COMPLETED" ? (day(v.actualEndDate) ?? day(v.endDate)) : null,
    notes: v.notes?.trim() || null,
    fileUrl,
    driveFileId: fileUrl ? v.driveFileId || null : null,
    fileMimeType: fileUrl ? v.fileMimeType || null : null,
  };
}
