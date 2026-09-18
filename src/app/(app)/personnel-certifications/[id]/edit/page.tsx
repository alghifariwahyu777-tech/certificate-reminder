import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { PersonnelCertificationForm } from "@/components/personnel/PersonnelCertificationForm";

export default async function EditPersonnelCertificationPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();

  const [certification, employees, categories] = await Promise.all([
    prisma.personnelCertification.findFirst({ where: { id: params.id, deletedAt: null } }),
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.personnelCertificationCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!certification) notFound();

  return (
    <>
      <Navbar
        title="Edit Sertifikasi Personil"
        subtitle={certification.certificationName}
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8">
        <PersonnelCertificationForm
          employees={employees.map((e) => ({ id: e.id, name: e.name, position: e.position }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          initialData={{
            id: certification.id,
            employeeId: certification.employeeId,
            categoryId: certification.categoryId,
            certificationName: certification.certificationName,
            certificationNumber: certification.certificationNumber || undefined,
            issuingBody: certification.issuingBody || undefined,
            issueDate: certification.issueDate?.toISOString() || undefined,
            validFrom: certification.validFrom?.toISOString() || undefined,
            expiryDate: certification.expiryDate.toISOString(),
            ccEmail: certification.ccEmail || undefined,
            notes: certification.notes || undefined,
            fileUrl: certification.fileUrl || undefined,
            driveFileId: certification.driveFileId || undefined,
            fileMimeType: certification.fileMimeType || undefined,
          }}
        />
      </div>
    </>
  );
}
