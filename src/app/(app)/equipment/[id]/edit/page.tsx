import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { EquipmentForm } from "@/components/equipment/EquipmentForm";

export default async function EditEquipmentPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect(`/equipment/${params.id}`);

  const [equipment, employees, categories] = await Promise.all([
    prisma.equipment.findFirst({ where: { id: params.id, deletedAt: null } }),
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.equipmentCategory.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!equipment) notFound();

  return (
    <>
      <Navbar title="Edit Equipment" subtitle={equipment.name} adminName={session.name} role={session.role} />
      <div className="p-5 md:p-8">
        <EquipmentForm
          employees={employees.map((e) => ({ id: e.id, name: e.name, employeeId: e.employeeId }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          initialData={{
            id: equipment.id,
            name: equipment.name,
            assetNumber: equipment.assetNumber || "",
            serialNumber: equipment.serialNumber || "",
            brand: equipment.brand || "",
            model: equipment.model || "",
            color: equipment.color || "",
            categoryId: equipment.categoryId,
            picId: equipment.picId,
            ccEmail: equipment.ccEmail || "",
            condition: equipment.condition || "",
            usageStatus: equipment.usageStatus || "",
            ownerUnit: equipment.ownerUnit || "",
            calibrationNumber: equipment.calibrationNumber || "",
            calibratedBy: equipment.calibratedBy || "",
            calibrationType: equipment.calibrationType || "",
            calibrationInterval: equipment.calibrationInterval || "",
            measurementRange: equipment.measurementRange || "",
            lastCalibrationDate: equipment.lastCalibrationDate?.toISOString() || "",
            nextCalibrationDate: equipment.nextCalibrationDate.toISOString(),
            notes: equipment.notes || "",
            fileUrl: equipment.fileUrl,
            driveFileId: equipment.driveFileId,
            fileMimeType: equipment.fileMimeType,
          }}
        />
      </div>
    </>
  );
}
