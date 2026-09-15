import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { ApplicationListClient } from "@/components/application/ApplicationListClient";

export default async function ApplicationsPage() {
  const session = await getSession();

  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: { select: { name: true } }, service: { select: { name: true, code: true } } },
  });

  return (
    <>
      <Navbar
        title="Applications"
        subtitle="Permohonan sertifikasi dari klien"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8">
        <ApplicationListClient
          initialApplications={applications.map((a) => ({
            id: a.id,
            applicationNumber: a.applicationNumber,
            clientName: a.client.name,
            serviceName: a.service.name,
            status: a.status,
            createdAt: a.createdAt.toISOString(),
            submittedAt: a.submittedAt?.toISOString() || null,
          }))}
        />
      </div>
    </>
  );
}
