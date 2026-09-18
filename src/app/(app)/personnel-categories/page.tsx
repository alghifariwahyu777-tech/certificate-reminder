import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { PersonnelCategoryManager } from "@/components/personnel/PersonnelCategoryManager";

export default async function PersonnelCategoriesPage() {
  const session = await getSession();
  const categories = await prisma.personnelCertificationCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { certifications: true } } },
  });

  return (
    <>
      <Navbar
        title="Kategori Sertifikasi Personil"
        subtitle="Kelola daftar kategori kompetensi/sertifikasi internal"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 max-w-3xl">
        <PersonnelCategoryManager
          canManage={session?.role === "ADMIN"}
          initialCategories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            certificationCount: c._count.certifications,
          }))}
        />
      </div>
    </>
  );
}
