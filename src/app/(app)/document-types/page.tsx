import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { DocumentTypeManager } from "@/components/documenttype/DocumentTypeManager";
import { PageBody } from "@/components/layout/PageBody";

export default async function DocumentTypesPage() {
  const session = await getSession();
  const documentTypes = await prisma.documentType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { requirements: true } } },
  });

  return (
    <>
      <Navbar
        title="Jenis Dokumen"
        subtitle="Jenis dokumen yang diminta dalam permohonan"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <PageBody>
        <DocumentTypeManager
          canManage={session?.role === "ADMIN"}
          initialDocumentTypes={documentTypes.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            usageCount: d._count.requirements,
          }))}
        />
      </PageBody>
    </>
  );
}
