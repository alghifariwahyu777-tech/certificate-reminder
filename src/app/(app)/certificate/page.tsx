import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { CertificateListClient } from "@/components/certificate/CertificateListClient";
import { PageBody } from "@/components/layout/PageBody";

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
        title="Sertifikat Klien"
        subtitle="Daftar seluruh sertifikat klien"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <PageBody>
        <CertificateListClient
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          canManage={session?.role === "ADMIN"}
        />
      </PageBody>
    </>
  );
}
