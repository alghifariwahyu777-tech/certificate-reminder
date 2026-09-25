import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { getDaysRemaining } from "@/lib/status";
import { Pencil, Download, ArrowLeft, FileWarning } from "lucide-react";

export default async function EquipmentDetailPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();

  const equipment = await prisma.equipment.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { category: true, pic: { include: { department: true } } },
  });
  if (!equipment) notFound();

  const days = getDaysRemaining(equipment.nextCalibrationDate);
  const isImage = equipment.fileMimeType?.startsWith("image/") ?? false;

  const fields: { label: string; value: string }[] = [
    { label: "Kategori", value: equipment.category.name },
    { label: "Merk", value: equipment.brand || "-" },
    { label: "Tipe", value: equipment.model || "-" },
    { label: "Warna", value: equipment.color || "-" },
    { label: "Nomor Aset/CODE", value: equipment.assetNumber || "-" },
    { label: "Serial Number", value: equipment.serialNumber || "-" },
    { label: "Kondisi Barang", value: equipment.condition || "-" },
    { label: "Status Barang", value: equipment.usageStatus || "-" },
    { label: "Unit Kerja Pemilik", value: equipment.ownerUnit || "-" },
    { label: "PIC", value: equipment.pic.name },
    { label: "NIP PIC", value: equipment.pic.employeeId || "-" },
    { label: "Divisi PIC", value: equipment.pic.department?.name || "-" },
    { label: "Email PIC", value: equipment.pic.email },
    { label: "Nomor Sertifikat Kalibrasi", value: equipment.calibrationNumber || "-" },
    { label: "Lembaga Kalibrasi", value: equipment.calibratedBy || "-" },
    { label: "Jenis Kalibrasi", value: equipment.calibrationType || "-" },
    { label: "Interval Kalibrasi", value: equipment.calibrationInterval || "-" },
    { label: "Range / Kapasitas", value: equipment.measurementRange || "-" },
    { label: "Kalibrasi Terakhir", value: equipment.lastCalibrationDate ? formatDate(equipment.lastCalibrationDate) : "-" },
    { label: "Kalibrasi Berikutnya", value: formatDate(equipment.nextCalibrationDate) },
    { label: "Sisa Hari", value: days < 0 ? `Terlambat ${Math.abs(days)} hari` : `${days} hari lagi` },
  ];

  return (
    <>
      <Navbar
        title="Equipment Detail"
        subtitle={equipment.assetNumber || equipment.name}
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/equipment" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Equipment Calibration
          </Link>
          {session?.role === "ADMIN" && (
            <Link href={`/equipment/${equipment.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{equipment.name}</CardTitle>
              <p className="text-sm text-slate-500 font-mono mt-1">{equipment.assetNumber || "Tanpa nomor aset"}</p>
            </div>
            <StatusBadge expiryDate={equipment.nextCalibrationDate} />
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{f.label}</p>
                <p className="text-sm text-ink font-medium">{f.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {equipment.notes && (
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Catatan</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{equipment.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sertifikat Kalibrasi</CardTitle>
            {equipment.fileUrl && (
              <a href={`${equipment.fileUrl}?download=1`}>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
            )}
          </CardHeader>
          <CardContent>
            {!equipment.fileUrl ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                <FileWarning className="h-8 w-8" />
                <p className="text-sm">Belum ada dokumen yang diunggah.</p>
              </div>
            ) : isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={equipment.fileUrl}
                alt={equipment.name}
                className="max-h-[600px] mx-auto rounded border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <iframe src={equipment.fileUrl} className="w-full h-[600px] rounded border border-slate-200 dark:border-slate-700" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
