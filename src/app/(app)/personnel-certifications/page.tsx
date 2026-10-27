import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { PersonnelCertificationListClient } from "@/components/personnel/PersonnelCertificationListClient";

export default async function PersonnelCertificationsPage() {
  const session = await getSession();
  const [certifications, categories] = await Promise.all([
    prisma.personnelCertification.findMany({
      where: { deletedAt: null },
      include: { employee: { include: { department: true } }, category: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.personnelCertificationCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Navbar
        title="Sertifikasi Personil"
        subtitle="Pengingat sertifikasi & kompetensi internal — terpisah dari sertifikat klien"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8">
        <PersonnelCertificationListClient
          canManage={session?.role === "ADMIN"}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          initialCertifications={certifications.map((c) => ({
            id: c.id,
            certificationName: c.certificationName,
            certificationNumber: c.certificationNumber,
            categoryId: c.categoryId,
            categoryName: c.category.name,
            employeeName: c.employee.name,
            departmentName: c.employee.department?.name || null,
            expiryDate: c.expiryDate.toISOString(),
            fileUrl: c.fileUrl,
          }))}
        />
      </div>
    </>
  );
}
