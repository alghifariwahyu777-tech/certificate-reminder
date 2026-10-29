import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { ServiceManager } from "@/components/service/ServiceManager";
import { PageBody } from "@/components/layout/PageBody";

export default async function ServicesPage() {
  const session = await getSession();
  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { requirements: true, stages: true } } },
  });

  return (
    <>
      <Navbar
        title="Layanan"
        subtitle="Layanan sertifikasi beserta persyaratan dan alur prosesnya"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <PageBody>
        <ServiceManager
          canManage={session?.role === "ADMIN"}
          initialServices={services.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            description: s.description,
            isActive: s.isActive,
            requiresAudit: s.requiresAudit,
            requiresSurveillance: s.requiresSurveillance,
            surveillanceCount: s.surveillanceCount,
            surveillanceIntervalMonths: s.surveillanceIntervalMonths,
            estimatedProcessingDays: s.estimatedProcessingDays,
            requirementCount: s._count.requirements,
            stageCount: s._count.stages,
          }))}
        />
      </PageBody>
    </>
  );
}
