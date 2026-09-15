import { prisma } from "@/lib/prisma";
import { NewApplicationForm } from "@/components/portal/NewApplicationForm";

export default async function NewApplicationPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return (
    <div className="p-5 md:p-8 max-w-xl space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink dark:text-slate-100">
          Ajukan Sertifikasi Baru
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Pilih layanan dan isi data kontak. Anda bisa mengunggah dokumen di langkah berikutnya.
        </p>
      </div>
      <NewApplicationForm services={services} />
    </div>
  );
}
