import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { CategoryManager } from "@/components/category/CategoryManager";

export default async function CategoryPage() {
  const session = await getSession();
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { certificates: true } } },
  });

  return (
    <>
      <Navbar title="Category" subtitle="Kelola kategori sertifikat" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <div className="p-5 md:p-8 max-w-3xl">
        <CategoryManager
          canManage={session?.role === "ADMIN"}
          initialCategories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            certificateCount: c._count.certificates,
          }))}
        />
      </div>
    </>
  );
}
