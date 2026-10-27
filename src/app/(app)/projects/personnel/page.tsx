import { ensureDemoDataOnce } from "@/lib/demo-data";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { getPersonnelMapping } from "@/lib/personnel-mapping";
import { PersonnelMapping } from "@/components/project/monitoring/PersonnelMapping";

export default async function PersonnelMappingPage() {
  const session = await getSession();
  await ensureDemoDataOnce();
  const [rows, projects] = await Promise.all([
    getPersonnelMapping(true),
    prisma.project.findMany({ where: { deletedAt: null, status: "ONGOING" }, select: { id: true, projectName: true, projectNumber: true }, orderBy: { projectName: "asc" } }),
  ]);
  return (
    <>
      <Navbar title="Mapping Personil" subtitle="Beban kerja dan sertifikasi personil" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <div className="p-5 md:p-8">
        <PersonnelMapping rows={rows} projects={projects.map((p) => ({ id: p.id, name: p.projectName, number: p.projectNumber }))} canManage={session?.role === "ADMIN"} />
      </div>
    </>
  );
}
