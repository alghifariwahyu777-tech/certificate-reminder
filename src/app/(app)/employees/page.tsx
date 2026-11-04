import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { EmployeeManager } from "@/components/personnel/EmployeeManager";
import { PageBody } from "@/components/layout/PageBody";
import { can } from "@/lib/permissions";

export default async function EmployeesPage() {
  const session = await getSession();
  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({
      orderBy: { name: "asc" },
      include: { department: true, _count: { select: { certifications: true } } },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Navbar
        title="Karyawan"
        subtitle="Daftar personil penerima pengingat sertifikasi"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <PageBody>
        <EmployeeManager
          canManage={can(session?.role, "personnel")}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          initialEmployees={employees.map((e) => ({
            id: e.id,
            name: e.name,
            employeeId: e.employeeId,
            position: e.position,
            departmentId: e.departmentId,
            departmentName: e.department?.name || null,
            email: e.email,
            isActive: e.isActive,
            certificationCount: e._count.certifications,
          }))}
        />
      </PageBody>
    </>
  );
}
