import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectCategoryManager } from "@/components/project/ProjectCategoryManager";
import { PageBody } from "@/components/layout/PageBody";

export default async function ProjectCategoriesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const categories = await prisma.projectCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <>
      <Navbar
        title="Kategori Project"
        subtitle="Kelompok portofolio project"
        adminName={session.name}
        role={session.role}
      />
      <PageBody>
        <ProjectCategoryManager
          initialCategories={categories.map((c) => ({ id: c.id, name: c.name, projectCount: c._count.projects }))}
          canManage={session.role === "ADMIN"}
        />
      </PageBody>
    </>
  );
}
