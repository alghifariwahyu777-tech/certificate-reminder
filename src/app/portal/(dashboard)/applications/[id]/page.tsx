import { notFound } from "next/navigation";
import { getClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { PortalApplicationDetail } from "@/components/portal/PortalApplicationDetail";

export default async function PortalApplicationDetailPage({ params }: { params: { id: string } }) {
  const session = await getClientSession();
  if (!session) return null;

  const application = await prisma.application.findFirst({
    where: { id: params.id, clientId: session.clientId },
    include: {
      service: {
        include: { requirements: { include: { documentType: true }, orderBy: { displayOrder: "asc" } } },
      },
      documents: { orderBy: [{ serviceRequirementId: "asc" }, { version: "desc" }] },
      stages: {
        where: { workflowStage: { clientVisible: true } },
        include: { workflowStage: true },
        orderBy: { workflowStage: { sequence: "asc" } },
      },
      certificate: { select: { id: true, certificateNumber: true, expiryDate: true } },
    },
  });

  if (!application) notFound();

  // Keep only the latest version per requirement for the checklist view.
  const latestByRequirement = new Map<string, (typeof application.documents)[number]>();
  for (const doc of application.documents) {
    const existing = latestByRequirement.get(doc.serviceRequirementId);
    if (!existing || doc.version > existing.version) latestByRequirement.set(doc.serviceRequirementId, doc);
  }

  return (
    <PortalApplicationDetail
      application={{
        id: application.id,
        applicationNumber: application.applicationNumber,
        status: application.status,
        contactName: application.contactName,
        contactPosition: application.contactPosition,
        contactEmail: application.contactEmail,
        contactPhone: application.contactPhone,
        description: application.description,
        createdAt: application.createdAt.toISOString(),
        submittedAt: application.submittedAt?.toISOString() || null,
        service: { id: application.service.id, name: application.service.name, code: application.service.code },
      }}
      requirements={application.service.requirements.map((r) => ({
        id: r.id,
        documentTypeName: r.documentType.name,
        mandatory: r.mandatory,
        allowedFileTypes: r.allowedFileTypes,
        maxFileSizeMB: r.maxFileSizeMB,
      }))}
      documentsByRequirement={Object.fromEntries(
        Array.from(latestByRequirement.entries()).map(([reqId, doc]) => [
          reqId,
          {
            id: doc.id,
            version: doc.version,
            fileUrl: doc.fileUrl,
            status: doc.status,
            reviewComment: doc.reviewComment,
          },
        ])
      )}
      stages={application.stages.map((s) => ({
        id: s.id,
        name: s.workflowStage.name,
        clientDescription: s.workflowStage.clientDescription,
        sequence: s.workflowStage.sequence,
        status: s.status,
        completedDate: s.completedDate?.toISOString() || null,
      }))}
      certificate={
        application.certificate
          ? {
              id: application.certificate.id,
              certificateNumber: application.certificate.certificateNumber,
              expiryDate: application.certificate.expiryDate.toISOString(),
            }
          : null
      }
    />
  );
}
