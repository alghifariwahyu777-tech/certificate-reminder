import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { EquipmentForm } from "@/components/equipment/EquipmentForm";

export default async function NewEquipmentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/equipment");

  const [employees, categories] = await Promise.all([
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.equipmentCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Navbar title="Add Equipment" subtitle="Daftarkan alat baru untuk dimonitor kalibrasinya" adminName={session.name} role={session.role} />
      <div className="p-5 md:p-8">
        <EquipmentForm
          employees={employees.map((e) => ({ id: e.id, name: e.name, employeeId: e.employeeId }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </>
  );
}
