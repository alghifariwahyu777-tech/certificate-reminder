import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { ServiceDetailManager } from "@/components/service/ServiceDetailManager";
import { ArrowLeft } from "lucide-react";

export default async function ServiceDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();

  const [service, documentTypes] = await Promise.all([
    prisma.service.findUnique({
      where: { id: params.id },
      include: {
        requirements: { include: { documentType: true }, orderBy: { displayOrder: "asc" } },
        stages: { orderBy: { sequence: "asc" } },
      },
    }),
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!service) notFound();

  return (
    <>
      <Navbar
        title={service.name}
        subtitle={`Kode: ${service.code}`}
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 space-y-5">
        <Link href="/services" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Services
        </Link>

        <ServiceDetailManager
          serviceId={service.id}
          canManage={session?.role === "ADMIN"}
          documentTypeOptions={documentTypes.map((d) => ({ id: d.id, name: d.name }))}
          initialRequirements={service.requirements.map((r) => ({
            id: r.id,
            documentTypeId: r.documentTypeId,
            documentTypeName: r.documentType.name,
            mandatory: r.mandatory,
            allowedFileTypes: r.allowedFileTypes,
            maxFileSizeMB: r.maxFileSizeMB,
            templateUrl: r.templateUrl,
            displayOrder: r.displayOrder,
          }))}
          initialStages={service.stages.map((s) => ({
            id: s.id,
            name: s.name,
            stageType: s.stageType,
            sequence: s.sequence,
            slaDays: s.slaDays,
            picRole: s.picRole,
            clientVisible: s.clientVisible,
            clientDescription: s.clientDescription,
          }))}
        />
      </div>
    </>
  );
}
