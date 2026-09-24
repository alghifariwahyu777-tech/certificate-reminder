import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectForm } from "@/components/project/ProjectForm";

export default async function NewProjectPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/projects");

  const [categories] = await Promise.all([
    prisma.projectCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Navbar
        title="Add Project"
        subtitle="Daftarkan project/kontrak baru untuk dimonitor"
        adminName={session.name}
        role={session.role}
      />
      <div className="p-5 md:p-8">
        <ProjectForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </>
  );
}
