import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { DepartmentManager } from "@/components/department/DepartmentManager";
import { PageBody } from "@/components/layout/PageBody";
import { can } from "@/lib/permissions";

export default async function DepartmentsPage() {
  const session = await getSession();
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { certificates: true } } },
  });

  return (
    <>
      <Navbar title="Divisi" subtitle="Daftar divisi internal" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <PageBody>
        <DepartmentManager
          canManage={can(session?.role, "system")}
          initialDepartments={departments.map((d) => ({
            id: d.id,
            name: d.name,
            certificateCount: d._count.certificates,
          }))}
        />
      </PageBody>
    </>
  );
}
