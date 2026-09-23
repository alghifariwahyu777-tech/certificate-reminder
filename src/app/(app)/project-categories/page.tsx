import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectCategoryManager } from "@/components/project/ProjectCategoryManager";

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
        title="Project Categories"
        subtitle="Kelompok portofolio project (mis. PIK, Serco)"
        adminName={session.name}
        role={session.role}
      />
      <div className="p-5 md:p-8">
        <ProjectCategoryManager
          initialCategories={categories.map((c) => ({ id: c.id, name: c.name, projectCount: c._count.projects }))}
          canManage={session.role === "ADMIN"}
        />
      </div>
    </>
  );
}
