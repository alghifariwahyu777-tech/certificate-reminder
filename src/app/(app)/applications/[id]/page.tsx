import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { ApplicationReviewDetail } from "@/components/application/ApplicationReviewDetail";
import { ArrowLeft } from "lucide-react";

export default async function ApplicationDetailPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();

  const [application, categories, departments] = await Promise.all([
    prisma.application.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        service: {
          include: { requirements: { include: { documentType: true }, orderBy: { displayOrder: "asc" } } },
        },
        documents: { orderBy: [{ serviceRequirementId: "asc" }, { version: "desc" }] },
        stages: { include: { workflowStage: true }, orderBy: { workflowStage: { sequence: "asc" } } },
        certificate: true,
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!application) notFound();

  const latestByRequirement = new Map<string, (typeof application.documents)[number]>();
  for (const doc of application.documents) {
    const existing = latestByRequirement.get(doc.serviceRequirementId);
    if (!existing || doc.version > existing.version) latestByRequirement.set(doc.serviceRequirementId, doc);
  }

  return (
    <>
      <Navbar
        title={application.applicationNumber}
        subtitle={`${application.client.name} · ${application.service.name}`}
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 space-y-5">
        <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Applications
        </Link>

        <ApplicationReviewDetail
          canManage={session?.role === "ADMIN"}
          application={{
            id: application.id,
            applicationNumber: application.applicationNumber,
            status: application.status,
            contactName: application.contactName,
            contactPosition: application.contactPosition,
            contactEmail: application.contactEmail,
            contactPhone: application.contactPhone,
            description: application.description,
            notes: application.notes,
            createdAt: application.createdAt.toISOString(),
            submittedAt: application.submittedAt?.toISOString() || null,
            clientName: application.client.name,
            serviceName: application.service.name,
            contractValue: application.contractValue ? Number(application.contractValue) : null,
          }}
          requirements={application.service.requirements.map((r) => ({
            id: r.id,
            documentTypeName: r.documentType.name,
            mandatory: r.mandatory,
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
                reviewedBy: doc.reviewedBy,
              },
            ])
          )}
          stages={application.stages.map((s) => ({
            id: s.id,
            name: s.workflowStage.name,
            sequence: s.workflowStage.sequence,
            slaDays: s.workflowStage.slaDays,
            status: s.status,
            startDate: s.startDate?.toISOString() || null,
            targetDate: s.targetDate?.toISOString() || null,
            completedDate: s.completedDate?.toISOString() || null,
            picName: s.picName,
            internalNote: s.internalNote,
          }))}
          certificate={
            application.certificate
              ? { id: application.certificate.id, certificateNumber: application.certificate.certificateNumber }
              : null
          }
          categoryOptions={categories.map((c) => ({ id: c.id, name: c.name }))}
          departmentOptions={departments.map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>
    </>
  );
}
