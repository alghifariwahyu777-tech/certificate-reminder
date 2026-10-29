import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { CertificateForm } from "@/components/certificate/CertificateForm";
import { Notice } from "@/components/ui/Notice";
import { PageBody } from "@/components/layout/PageBody";

export default async function AddCertificatePage() {
  const session = await getSession();
  const [categories, clients, departments] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Navbar title="Tambah Sertifikat" subtitle="Catat sertifikat klien baru" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <PageBody width="form">
        {clients.length === 0 && (
          <Notice tone="warning" className="mb-5">
            Belum ada data klien. Tambahkan klien terlebih dahulu di halaman{" "}
            <a href="/clients" className="underline font-medium">
              Klien
            </a>{" "}
            sebelum membuat sertifikat.
          </Notice>
        )}
        <CertificateForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        />
      </PageBody>
    </>
  );
}
