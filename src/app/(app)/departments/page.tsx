import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { DepartmentManager } from "@/components/department/DepartmentManager";

export default async function DepartmentsPage() {
  const session = await getSession();
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { certificates: true } } },
  });

  return (
    <>
      <Navbar title="Departments" subtitle="Kelola divisi internal" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <div className="p-5 md:p-8 max-w-3xl">
        <DepartmentManager
          canManage={session?.role === "ADMIN"}
          initialDepartments={departments.map((d) => ({
            id: d.id,
            name: d.name,
            certificateCount: d._count.certificates,
          }))}
        />
      </div>
    </>
  );
}
