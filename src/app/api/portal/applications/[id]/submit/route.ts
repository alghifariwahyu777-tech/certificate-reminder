import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";
import { logAudit } from "@/lib/audit";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const application = await prisma.application.findFirst({
    where: { id: params.id, clientId: session.clientId },
    include: { service: { include: { requirements: true } }, documents: true },
  });
  if (!application) return NextResponse.json({ message: "Permohonan tidak ditemukan." }, { status: 404 });

  if (!["DRAFT", "REVISION_REQUIRED"].includes(application.status)) {
    return NextResponse.json({ message: "Permohonan ini sudah diajukan sebelumnya." }, { status: 409 });
  }

  // Every mandatory requirement needs at least one uploaded document (the
  // latest version per requirement) before the client can submit.
  const latestByRequirement = new Map<string, number>();
  for (const doc of application.documents) {
    const current = latestByRequirement.get(doc.serviceRequirementId) || 0;
    if (doc.version > current) latestByRequirement.set(doc.serviceRequirementId, doc.version);
  }

  const missing = application.service.requirements.filter(
    (r) => r.mandatory && !latestByRequirement.has(r.id)
  );
  if (missing.length > 0) {
    return NextResponse.json(
      { message: `Masih ada ${missing.length} dokumen wajib yang belum diunggah.` },
      { status: 400 }
    );
  }

  const wasRevision = application.status === "REVISION_REQUIRED";

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  await logAudit({
    userName: session.name,
    action: "UPDATE",
    entityType: "Application",
    entityId: application.id,
    description: `${session.name} ${wasRevision ? "mengajukan ulang" : "mengajukan"} permohonan ${application.applicationNumber}.`,
  });

  return NextResponse.json({ application: updated });
}
