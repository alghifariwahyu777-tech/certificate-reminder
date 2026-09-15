import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { CertificateForm } from "@/components/certificate/CertificateForm";

export default async function AddCertificatePage() {
  const session = await getSession();
  const [categories, clients, departments] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Navbar title="Tambah Sertifikat" subtitle="Daftarkan sertifikat baru ke registry" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <div className="p-5 md:p-8 max-w-3xl">
        {clients.length === 0 && (
          <div className="mb-5 rounded border border-signal-soonBorder bg-signal-soonBg px-4 py-3 text-sm text-signal-soon">
            Belum ada data klien. Tambahkan klien terlebih dahulu di halaman{" "}
            <a href="/clients" className="underline font-medium">
              Clients
            </a>{" "}
            sebelum membuat sertifikat.
          </div>
        )}
        <CertificateForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>
    </>
  );
}
