import { getClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { PortalCertificateList } from "@/components/portal/PortalCertificateList";

export default async function PortalCertificatesPage() {
  const session = await getClientSession();
  if (!session) return null;

  const certificates = await prisma.certificate.findMany({
    where: { clientId: session.clientId, deletedAt: null },
    include: { category: true },
    orderBy: { expiryDate: "asc" },
  });

  return (
    <div className="p-5 md:p-8 space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink dark:text-slate-100">Sertifikat Saya</h1>
        <p className="text-sm text-slate-500 mt-0.5">Seluruh sertifikat milik perusahaan Anda.</p>
      </div>
      <PortalCertificateList
        certificates={certificates.map((c) => ({
          id: c.id,
          certificateNumber: c.certificateNumber,
          certificateName: c.certificateName,
          categoryName: c.category.name,
          issueDate: c.issueDate.toISOString(),
          expiryDate: c.expiryDate.toISOString(),
          fileUrl: c.fileUrl,
        }))}
      />
    </div>
  );
}
