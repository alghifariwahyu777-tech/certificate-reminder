import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { CategoryManager } from "@/components/category/CategoryManager";
import { PageBody } from "@/components/layout/PageBody";

export default async function CategoryPage() {
  const session = await getSession();
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { certificates: true } } },
  });

  return (
    <>
      <Navbar title="Kategori Sertifikat" subtitle="Kelompok sertifikat klien" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <PageBody>
        <CategoryManager
          canManage={session?.role === "ADMIN"}
          initialCategories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            certificateCount: c._count.certificates,
          }))}
        />
      </PageBody>
    </>
  );
}
