import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { CertificateListClient } from "@/components/certificate/CertificateListClient";

export default async function CertificatePage() {
  const session = await getSession();
  const [categories, clients, departments] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Navbar
        title="Certificate"
        subtitle="Seluruh data sertifikat dalam registry"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8">
        <CertificateListClient
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          canManage={session?.role === "ADMIN"}
        />
      </div>
    </>
  );
}
