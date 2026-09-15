import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { DocumentTypeManager } from "@/components/documenttype/DocumentTypeManager";

export default async function DocumentTypesPage() {
  const session = await getSession();
  const documentTypes = await prisma.documentType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { requirements: true } } },
  });

  return (
    <>
      <Navbar
        title="Document Types"
        subtitle="Master jenis dokumen persyaratan permohonan"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 max-w-3xl">
        <DocumentTypeManager
          canManage={session?.role === "ADMIN"}
          initialDocumentTypes={documentTypes.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            usageCount: d._count.requirements,
          }))}
        />
      </div>
    </>
  );
}
