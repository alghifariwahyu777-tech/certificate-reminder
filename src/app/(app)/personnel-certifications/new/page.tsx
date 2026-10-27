import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { PersonnelCertificationForm } from "@/components/personnel/PersonnelCertificationForm";

export default async function NewPersonnelCertificationPage() {
  const session = await getSession();
  const [employees, categories] = await Promise.all([
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.personnelCertificationCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Navbar
        title="Tambah Sertifikasi Personil"
        subtitle="Catat sertifikasi/kompetensi baru untuk personil internal"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8">
        <PersonnelCertificationForm
          employees={employees.map((e) => ({ id: e.id, name: e.name, position: e.position }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </>
  );
}
