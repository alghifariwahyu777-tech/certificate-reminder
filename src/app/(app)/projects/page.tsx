import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectListClient } from "@/components/project/ProjectListClient";

export default async function ProjectsPage() {
  const session = await getSession();
  const [projects, categories] = await Promise.all([
    prisma.project.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { targetEndDate: "asc" },
    }),
    prisma.projectCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Navbar
        title="Project Monitoring"
        subtitle="Database & pengingat durasi project internal perusahaan"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8">
        <ProjectListClient
          canManage={session?.role === "ADMIN"}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          initialProjects={projects.map((p) => ({
            id: p.id,
            projectNumber: p.projectNumber,
            projectName: p.projectName,
            categoryName: p.category.name,
            clientName: p.clientName,
            pic: p.pic,
            targetEndDate: p.targetEndDate.toISOString(),
            status: p.status as "ONGOING" | "COMPLETED" | "CANCELLED",
            contractValue: p.contractValue?.toString() || null,
          }))}
        />
      </div>
    </>
  );
}
