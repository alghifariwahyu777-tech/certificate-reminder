import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { renewalSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const renewals = await prisma.renewal.findMany({
    where: { certificateId: params.id },
    orderBy: { renewalDate: "desc" },
  });

  return NextResponse.json({ renewals });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const certificate = await prisma.certificate.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!certificate) {
    return NextResponse.json({ message: "Sertifikat tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = renewalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  // Reject duplicate certificate number unless it's unchanged from current.
  if (parsed.data.newCertificateNumber !== certificate.certificateNumber) {
    const duplicate = await prisma.certificate.findUnique({
      where: { certificateNumber: parsed.data.newCertificateNumber },
    });
    if (duplicate) {
      return NextResponse.json({ message: "Nomor sertifikat baru sudah digunakan." }, { status: 409 });
    }
  }

  const [renewal] = await prisma.$transaction([
    prisma.renewal.create({
      data: {
        certificateId: certificate.id,
        renewalDate: new Date(parsed.data.renewalDate),
        previousNumber: certificate.certificateNumber,
        previousExpiryDate: certificate.expiryDate,
        newCertificateNumber: parsed.data.newCertificateNumber,
        newValidFrom: parsed.data.newValidFrom ? new Date(parsed.data.newValidFrom) : null,
        newExpiryDate: new Date(parsed.data.newExpiryDate),
        notes: parsed.data.notes || null,
        fileUrl: parsed.data.fileUrl || null,
        driveFileId: parsed.data.driveFileId || null,
        fileMimeType: parsed.data.fileMimeType || null,
      },
    }),
    prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        certificateNumber: parsed.data.newCertificateNumber,
        validFrom: parsed.data.newValidFrom ? new Date(parsed.data.newValidFrom) : undefined,
        expiryDate: new Date(parsed.data.newExpiryDate),
        ...(parsed.data.fileUrl
          ? {
              fileUrl: parsed.data.fileUrl,
              driveFileId: parsed.data.driveFileId || null,
              fileMimeType: parsed.data.fileMimeType || null,
            }
          : {}),
      },
    }),
  ]);

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "RENEW",
    entityType: "Renewal",
    entityId: renewal.id,
    description: `Memperpanjang sertifikat "${certificate.certificateName}": ${certificate.certificateNumber} → ${parsed.data.newCertificateNumber}.`,
  });

  return NextResponse.json({ renewal }, { status: 201 });
}
