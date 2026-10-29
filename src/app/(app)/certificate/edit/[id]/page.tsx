import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { CertificateForm } from "@/components/certificate/CertificateForm";
import { PageBody } from "@/components/layout/PageBody";

export default async function EditCertificatePage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();
  const [certificate, categories, clients, departments] = await Promise.all([
    prisma.certificate.findFirst({
      where: { id: params.id, deletedAt: null },
      include: { category: true, client: true, department: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!certificate) notFound();

  return (
    <>
      <Navbar title="Ubah Sertifikat" subtitle={certificate.certificateName} adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <PageBody width="form">
        <CertificateForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          initialData={{
            ...certificate,
            issueDate: certificate.issueDate.toISOString(),
            validFrom: certificate.validFrom ? certificate.validFrom.toISOString() : null,
            expiryDate: certificate.expiryDate.toISOString(),
            createdAt: certificate.createdAt.toISOString(),
            updatedAt: certificate.updatedAt.toISOString(),
          }}
        />
      </PageBody>
    </>
  );
}
