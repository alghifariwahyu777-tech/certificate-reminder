import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { EquipmentForm } from "@/components/equipment/EquipmentForm";
import { PageBody } from "@/components/layout/PageBody";

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
      <Navbar title="Tambah Alat" subtitle="Daftarkan alat untuk dipantau jadwal kalibrasinya" adminName={session.name} role={session.role} />
      <PageBody width="form">
        <EquipmentForm
          employees={employees.map((e) => ({ id: e.id, name: e.name, employeeId: e.employeeId }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </PageBody>
    </>
  );
}
