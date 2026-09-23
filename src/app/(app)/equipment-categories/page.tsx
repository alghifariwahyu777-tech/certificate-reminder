import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { EquipmentCategoryManager } from "@/components/equipment/EquipmentCategoryManager";

export default async function EquipmentCategoriesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const categories = await prisma.equipmentCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { equipment: true } } },
  });

  return (
    <>
      <Navbar
        title="Equipment Categories"
        subtitle="Kelompok jenis alat (mis. Alat Ukur Listrik, Alat Ukur Dimensi)"
        adminName={session.name}
        role={session.role}
      />
      <div className="p-5 md:p-8">
        <EquipmentCategoryManager
          initialCategories={categories.map((c) => ({ id: c.id, name: c.name, equipmentCount: c._count.equipment }))}
          canManage={session.role === "ADMIN"}
        />
      </div>
    </>
  );
}
