import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { EmployeeManager } from "@/components/personnel/EmployeeManager";

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
        title="Personil"
        subtitle="Kelola daftar personil internal untuk pengingat sertifikasi/kompetensi"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 max-w-5xl">
        <EmployeeManager
          canManage={session?.role === "ADMIN"}
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
      </div>
    </>
  );
}
