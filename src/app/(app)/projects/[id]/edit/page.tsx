import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectForm } from "@/components/project/ProjectForm";

export default async function EditProjectPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect(`/projects/${params.id}`);

  const [project, categories] = await Promise.all([
    prisma.project.findFirst({ where: { id: params.id, deletedAt: null } }),
    prisma.projectCategory.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!project) notFound();

  return (
    <>
      <Navbar title="Edit Project" subtitle={project.projectName} adminName={session.name} role={session.role} />
      <div className="p-5 md:p-8">
        <ProjectForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          initialData={{
            id: project.id,
            projectNumber: project.projectNumber,
            projectName: project.projectName,
            categoryId: project.categoryId,
            clientName: project.clientName,
            pic: project.pic,
            picEmail: project.picEmail || "",
            ccEmail: project.ccEmail || "",
            contractValue: project.contractValue?.toString() || "",
            startDate: project.startDate?.toISOString() || "",
            targetEndDate: project.targetEndDate.toISOString(),
            actualEndDate: project.actualEndDate?.toISOString() || "",
            status: project.status as "ONGOING" | "COMPLETED" | "CANCELLED",
            description: project.description || "",
            notes: project.notes || "",
            fileUrl: project.fileUrl,
            driveFileId: project.driveFileId,
            fileMimeType: project.fileMimeType,
          }}
        />
      </div>
    </>
  );
}
