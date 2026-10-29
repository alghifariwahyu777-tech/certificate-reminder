import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectForm } from "@/components/project/ProjectForm";
import { PageBody } from "@/components/layout/PageBody";

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
        title="Project Baru"
        subtitle="Daftarkan project untuk dipantau"
        adminName={session.name}
        role={session.role}
      />
      <PageBody width="form">
        <ProjectForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </PageBody>
    </>
  );
}
