import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { EquipmentListClient } from "@/components/equipment/EquipmentListClient";
import { PageBody } from "@/components/layout/PageBody";

export default async function EquipmentPage() {
  const session = await getSession();
  const [equipment, categories] = await Promise.all([
    prisma.equipment.findMany({
      where: { deletedAt: null },
      include: { category: true, pic: true },
      orderBy: { nextCalibrationDate: "asc" },
    }),
    prisma.equipmentCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Navbar
        title="Kalibrasi Alat"
        subtitle="Jadwal kalibrasi alat milik Sucofindo"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <PageBody>
        <EquipmentListClient
          canManage={session?.role === "ADMIN"}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          initialEquipment={equipment.map((e) => ({
            id: e.id,
            name: e.name,
            assetNumber: e.assetNumber,
            brand: e.brand,
            model: e.model,
            categoryName: e.category.name,
            picName: e.pic.name,
            nextCalibrationDate: e.nextCalibrationDate.toISOString(),
          }))}
        />
      </PageBody>
    </>
  );
}
