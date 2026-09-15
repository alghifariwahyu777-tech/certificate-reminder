import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { issueCertificateSchema } from "@/lib/validations";
import { generateSurveillanceSchedule } from "@/lib/surveillance";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/applications/[id]/issue
 *
 * The Phase 7 "Automatic Completion" step: once an internal user uploads the
 * final certificate for an APPROVED application, this:
 *  1. Creates the Certificate record, linked back to the Application/Service.
 *  2. Marks the Application COMPLETED.
 *  3. Closes out every remaining tracking stage (Phase 6) as COMPLETED.
 *  4. If the service requires surveillance (Phase 8), schedules every visit
 *     spaced `surveillanceIntervalMonths` apart from the issue date.
 * Reminder emails need no separate "activation" step — the existing daily
 * reminder check already scans every non-deleted Certificate automatically.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: { certificate: true, service: true },
  });
  if (!application) return NextResponse.json({ message: "Permohonan tidak ditemukan." }, { status: 404 });

  if (application.status !== "APPROVED") {
    return NextResponse.json(
      { message: "Sertifikat hanya bisa diterbitkan untuk permohonan yang sudah Disetujui." },
      { status: 409 }
    );
  }
  if (application.certificate) {
    return NextResponse.json(
      { message: "Sertifikat untuk permohonan ini sudah pernah diterbitkan." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = issueCertificateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const duplicate = await prisma.certificate.findUnique({
    where: { certificateNumber: parsed.data.certificateNumber },
  });
  if (duplicate) {
    const message = duplicate.deletedAt
      ? "Nomor sertifikat ini sudah dipakai oleh sertifikat yang ada di Trash. Pulihkan atau hapus permanen sertifikat itu dulu."
      : "Nomor sertifikat sudah digunakan.";
    return NextResponse.json({ message }, { status: 409 });
  }

  const [certificate] = await prisma.$transaction([
    prisma.certificate.create({
      data: {
        certificateNumber: parsed.data.certificateNumber,
        certificateName: parsed.data.certificateName,
        categoryId: parsed.data.categoryId,
        clientId: application.clientId,
        departmentId: parsed.data.departmentId || null,
        applicationId: application.id,
        serviceId: application.serviceId,
        issuingBody: parsed.data.issuingBody || null,
        issueDate: new Date(parsed.data.issueDate),
        validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : null,
        expiryDate: new Date(parsed.data.expiryDate),
        storageLocation: parsed.data.storageLocation || null,
        pic: parsed.data.pic,
        picEmail: parsed.data.picEmail || null,
        ccEmail: parsed.data.ccEmail || null,
        description: parsed.data.description || null,
        notes: parsed.data.notes || null,
        fileUrl: parsed.data.fileUrl,
        driveFileId: parsed.data.driveFileId,
        fileMimeType: parsed.data.fileMimeType,
      },
    }),
    prisma.application.update({
      where: { id: application.id },
      data: { status: "COMPLETED" },
    }),
    prisma.applicationStage.updateMany({
      where: { applicationId: application.id, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED", completedDate: new Date() },
    }),
  ]);

  if (application.service.requiresSurveillance) {
    await generateSurveillanceSchedule({
      certificateId: certificate.id,
      issueDate: certificate.issueDate,
      count: application.service.surveillanceCount || 0,
      intervalMonths: application.service.surveillanceIntervalMonths || 0,
    });
  }

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "Certificate",
    entityId: certificate.id,
    description: `Menerbitkan sertifikat "${certificate.certificateName}" (${certificate.certificateNumber}) dari permohonan ${application.applicationNumber} — permohonan otomatis diselesaikan.`,
  });

  return NextResponse.json({ certificate }, { status: 201 });
}
