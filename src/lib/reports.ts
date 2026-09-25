import { prisma } from "@/lib/prisma";
import { getCertificateStatus, getDaysRemaining } from "@/lib/status";
import { APPLICATION_STATUS_LABELS } from "@/lib/application";
import { SURVEILLANCE_STATUS_LABELS } from "@/lib/surveillance";
import { getMonitoringRows } from "@/lib/monitoring";

export type ReportType =
  | "active"
  | "expired"
  | "expiring_soon"
  | "renewal_history"
  | "recap_department"
  | "recap_category"
  | "application_status"
  | "surveillance"
  | "sla"
  | "monitoring"
  | "personnel_certifications"
  | "project_status"
  | "equipment_calibration";

export const REPORT_LABELS: Record<ReportType, string> = {
  active: "Sertifikat Aktif",
  expired: "Sertifikat Kedaluwarsa",
  expiring_soon: "Sertifikat Akan Berakhir",
  renewal_history: "Histori Renewal",
  recap_department: "Rekap per Divisi",
  recap_category: "Rekap per Kategori",
  application_status: "Status Permohonan",
  surveillance: "Jadwal Surveillance",
  sla: "Kepatuhan SLA Tahap Workflow",
  monitoring: "Monitoring Manajemen",
  personnel_certifications: "Sertifikasi Personil",
  project_status: "Status & Nilai Kontrak Project",
  equipment_calibration: "Jadwal Kalibrasi Alat",
};

export type ReportTable = {
  title: string;
  generatedAt: Date;
  columns: string[];
  rows: (string | number)[][];
};

async function certificateRows(filter: "active" | "expired" | "expiring_soon"): Promise<ReportTable> {
  const certificates = await prisma.certificate.findMany({
    where: { deletedAt: null },
    include: { category: true, client: true, department: true },
    orderBy: { expiryDate: "asc" },
  });

  const filtered = certificates.filter((c) => {
    const status = getCertificateStatus(c.expiryDate);
    if (filter === "active") return status === "ACTIVE";
    if (filter === "expired") return status === "EXPIRED";
    return status === "EXPIRING_SOON";
  });

  return {
    title: REPORT_LABELS[filter === "active" ? "active" : filter === "expired" ? "expired" : "expiring_soon"],
    generatedAt: new Date(),
    columns: [
      "No",
      "Nomor Sertifikat",
      "Nama Sertifikat",
      "Klien",
      "Kategori",
      "Divisi",
      "PIC",
      "Tanggal Terbit",
      "Tanggal Berakhir",
      "Sisa Hari",
    ],
    rows: filtered.map((c, i) => [
      i + 1,
      c.certificateNumber,
      c.certificateName,
      c.client.name,
      c.category.name,
      c.department?.name || "-",
      c.pic,
      c.issueDate.toISOString().slice(0, 10),
      c.expiryDate.toISOString().slice(0, 10),
      getDaysRemaining(c.expiryDate),
    ]),
  };
}

async function renewalHistoryReport(): Promise<ReportTable> {
  const renewals = await prisma.renewal.findMany({
    include: { certificate: { include: { client: true, category: true } } },
    orderBy: { renewalDate: "desc" },
  });

  return {
    title: REPORT_LABELS.renewal_history,
    generatedAt: new Date(),
    columns: [
      "No",
      "Tanggal Renewal",
      "Nomor Lama",
      "Nomor Baru",
      "Nama Sertifikat",
      "Klien",
      "Kategori",
      "Berakhir Baru",
      "Catatan",
    ],
    rows: renewals.map((r, i) => [
      i + 1,
      r.renewalDate.toISOString().slice(0, 10),
      r.previousNumber,
      r.newCertificateNumber,
      r.certificate.certificateName,
      r.certificate.client.name,
      r.certificate.category.name,
      r.newExpiryDate.toISOString().slice(0, 10),
      r.notes || "-",
    ]),
  };
}

async function recapByDepartment(): Promise<ReportTable> {
  const departments = await prisma.department.findMany({
    include: { certificates: { where: { deletedAt: null } } },
    orderBy: { name: "asc" },
  });

  return {
    title: REPORT_LABELS.recap_department,
    generatedAt: new Date(),
    columns: ["No", "Divisi", "Total Sertifikat", "Aktif", "Akan Berakhir", "Kedaluwarsa"],
    rows: departments.map((d, i) => {
      const active = d.certificates.filter((c) => getCertificateStatus(c.expiryDate) === "ACTIVE").length;
      const soon = d.certificates.filter((c) => getCertificateStatus(c.expiryDate) === "EXPIRING_SOON").length;
      const expired = d.certificates.filter((c) => getCertificateStatus(c.expiryDate) === "EXPIRED").length;
      return [i + 1, d.name, d.certificates.length, active, soon, expired];
    }),
  };
}

async function recapByCategory(): Promise<ReportTable> {
  const categories = await prisma.category.findMany({
    include: { certificates: { where: { deletedAt: null } } },
    orderBy: { name: "asc" },
  });

  return {
    title: REPORT_LABELS.recap_category,
    generatedAt: new Date(),
    columns: ["No", "Kategori", "Total Sertifikat", "Aktif", "Akan Berakhir", "Kedaluwarsa"],
    rows: categories.map((cat, i) => {
      const active = cat.certificates.filter((c) => getCertificateStatus(c.expiryDate) === "ACTIVE").length;
      const soon = cat.certificates.filter((c) => getCertificateStatus(c.expiryDate) === "EXPIRING_SOON").length;
      const expired = cat.certificates.filter((c) => getCertificateStatus(c.expiryDate) === "EXPIRED").length;
      return [i + 1, cat.name, cat.certificates.length, active, soon, expired];
    }),
  };
}

async function applicationStatusReport(): Promise<ReportTable> {
  const applications = await prisma.application.findMany({
    include: { client: true, service: true, certificate: { select: { createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    title: REPORT_LABELS.application_status,
    generatedAt: new Date(),
    columns: [
      "No",
      "Nomor Permohonan",
      "Klien",
      "Layanan",
      "Status",
      "Tanggal Diajukan",
      "Tanggal Sertifikat Terbit",
      "Lama Proses (hari)",
    ],
    rows: applications.map((a, i) => {
      const issuedAt = a.certificate?.createdAt;
      const processingDays =
        a.submittedAt && issuedAt
          ? Math.round((issuedAt.getTime() - a.submittedAt.getTime()) / (24 * 60 * 60 * 1000))
          : "-";
      return [
        i + 1,
        a.applicationNumber,
        a.client.name,
        a.service.name,
        APPLICATION_STATUS_LABELS[a.status] || a.status,
        a.submittedAt ? a.submittedAt.toISOString().slice(0, 10) : "-",
        issuedAt ? issuedAt.toISOString().slice(0, 10) : "-",
        processingDays,
      ];
    }),
  };
}

async function surveillanceReport(): Promise<ReportTable> {
  const surveillances = await prisma.surveillance.findMany({
    include: { certificate: { include: { client: true } } },
    orderBy: { scheduledDate: "asc" },
  });

  return {
    title: REPORT_LABELS.surveillance,
    generatedAt: new Date(),
    columns: [
      "No",
      "Nomor Sertifikat",
      "Nama Sertifikat",
      "Klien",
      "Surveillance Ke-",
      "Tanggal Jadwal",
      "Status",
      "Tanggal Selesai",
      "PIC",
    ],
    rows: surveillances.map((s, i) => [
      i + 1,
      s.certificate.certificateNumber,
      s.certificate.certificateName,
      s.certificate.client.name,
      s.sequenceNumber,
      s.scheduledDate.toISOString().slice(0, 10),
      SURVEILLANCE_STATUS_LABELS[s.status] || s.status,
      s.completedDate ? s.completedDate.toISOString().slice(0, 10) : "-",
      s.picName || "-",
    ]),
  };
}

async function slaComplianceReport(): Promise<ReportTable> {
  const stages = await prisma.applicationStage.findMany({
    where: { startDate: { not: null } },
    include: { application: { include: { service: true } }, workflowStage: true },
    orderBy: { startDate: "asc" },
  });

  return {
    title: REPORT_LABELS.sla,
    generatedAt: new Date(),
    columns: [
      "No",
      "Nomor Permohonan",
      "Layanan",
      "Tahap",
      "SLA Target (hari)",
      "Aktual (hari)",
      "Status",
    ],
    rows: stages.map((s, i) => {
      const slaDays = s.workflowStage.slaDays;
      const endpoint = s.completedDate || new Date();
      const actualDays = s.startDate
        ? Math.round((endpoint.getTime() - s.startDate.getTime()) / (24 * 60 * 60 * 1000))
        : 0;
      let complianceStatus = "Berjalan";
      if (s.completedDate) {
        complianceStatus = slaDays == null ? "-" : actualDays <= slaDays ? "Tepat Waktu" : "Terlambat";
      }
      return [
        i + 1,
        s.application.applicationNumber,
        s.application.service.name,
        s.workflowStage.name,
        slaDays ?? "-",
        actualDays,
        complianceStatus,
      ];
    }),
  };
}

async function monitoringReport(): Promise<ReportTable> {
  const rows = await getMonitoringRows();

  return {
    title: REPORT_LABELS.monitoring,
    generatedAt: new Date(),
    columns: [
      "No",
      "Nomor Permohonan",
      "Klien",
      "Layanan",
      "Status",
      "Tahap Saat Ini",
      "Hari di Tahap Ini",
      "Total Hari Proses",
      "Nilai Kontrak (Rp)",
    ],
    rows: rows.map((r, i) => [
      i + 1,
      r.applicationNumber,
      r.clientName,
      r.serviceName,
      r.overallState === "SELESAI" ? "Selesai" : r.overallState === "BERHENTI" ? r.statusLabel : "Berjalan",
      r.currentStageName || "-",
      r.daysInCurrentStage ?? "-",
      r.totalDays,
      r.contractValue ?? 0,
    ]),
  };
}

async function personnelCertificationsReport(): Promise<ReportTable> {
  const certifications = await prisma.personnelCertification.findMany({
    where: { deletedAt: null },
    include: { employee: { include: { department: true } }, category: true },
    orderBy: { expiryDate: "asc" },
  });

  return {
    title: REPORT_LABELS.personnel_certifications,
    generatedAt: new Date(),
    columns: [
      "No",
      "Nama Personil",
      "NIP",
      "Jabatan",
      "Divisi",
      "Kategori",
      "Nama Sertifikasi",
      "Nomor",
      "Tanggal Berakhir",
      "Status",
    ],
    rows: certifications.map((c, i) => [
      i + 1,
      c.employee.name,
      c.employee.employeeId || "-",
      c.employee.position || "-",
      c.employee.department?.name || "-",
      c.category.name,
      c.certificationName,
      c.certificationNumber || "-",
      c.expiryDate.toLocaleDateString("id-ID"),
      getCertificateStatus(c.expiryDate) === "EXPIRED"
        ? "Expired"
        : getCertificateStatus(c.expiryDate) === "EXPIRING_SOON"
          ? "Expiring Soon"
          : "Active",
    ]),
  };
}

async function projectReport(): Promise<ReportTable> {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    include: { category: true },
    orderBy: { targetEndDate: "asc" },
  });

  return {
    title: REPORT_LABELS.project_status,
    generatedAt: new Date(),
    columns: [
      "No",
      "Nomor Project",
      "Nama Project",
      "Kategori",
      "Klien",
      "PIC",
      "Nilai Kontrak",
      "Target Selesai",
      "Status",
    ],
    rows: projects.map((p, i) => [
      i + 1,
      p.projectNumber,
      p.projectName,
      p.category.name,
      p.clientName,
      p.pic,
      p.contractValue ? Number(p.contractValue) : 0,
      p.targetEndDate.toLocaleDateString("id-ID"),
      p.status === "ONGOING" ? "Berjalan" : p.status === "COMPLETED" ? "Selesai" : "Dibatalkan",
    ]),
  };
}

async function equipmentReport(): Promise<ReportTable> {
  const equipmentList = await prisma.equipment.findMany({
    where: { deletedAt: null },
    include: { category: true, pic: true },
    orderBy: { nextCalibrationDate: "asc" },
  });

  return {
    title: REPORT_LABELS.equipment_calibration,
    generatedAt: new Date(),
    columns: [
      "No",
      "Nama Alat",
      "Nomor Aset/CODE",
      "Serial Number",
      "Merk / Tipe",
      "Kategori",
      "Kondisi",
      "Status",
      "Unit Kerja Pemilik",
      "PIC",
      "No. Sertifikat Kalibrasi",
      "Lembaga Kalibrasi",
      "Jenis Kalibrasi",
      "Interval Kalibrasi",
      "Range/Kapasitas",
      "Kalibrasi Terakhir",
      "Kalibrasi Berikutnya",
      "Status Kalibrasi",
    ],
    rows: equipmentList.map((e, i) => [
      i + 1,
      e.name,
      e.assetNumber || "-",
      e.serialNumber || "-",
      [e.brand, e.model].filter(Boolean).join(" ") || "-",
      e.category.name,
      e.condition || "-",
      e.usageStatus || "-",
      e.ownerUnit || "-",
      e.pic.name,
      e.calibrationNumber || "-",
      e.calibratedBy || "-",
      e.calibrationType || "-",
      e.calibrationInterval || "-",
      e.measurementRange || "-",
      e.lastCalibrationDate ? e.lastCalibrationDate.toLocaleDateString("id-ID") : "-",
      e.nextCalibrationDate.toLocaleDateString("id-ID"),
      getCertificateStatus(e.nextCalibrationDate) === "EXPIRED"
        ? "Expired"
        : getCertificateStatus(e.nextCalibrationDate) === "EXPIRING_SOON"
          ? "Expiring Soon"
          : "Active",
    ]),
  };
}

export async function getReportTable(type: ReportType): Promise<ReportTable> {
  switch (type) {
    case "active":
      return certificateRows("active");
    case "expired":
      return certificateRows("expired");
    case "expiring_soon":
      return certificateRows("expiring_soon");
    case "renewal_history":
      return renewalHistoryReport();
    case "recap_department":
      return recapByDepartment();
    case "recap_category":
      return recapByCategory();
    case "application_status":
      return applicationStatusReport();
    case "surveillance":
      return surveillanceReport();
    case "sla":
      return slaComplianceReport();
    case "monitoring":
      return monitoringReport();
    case "personnel_certifications":
      return personnelCertificationsReport();
    case "project_status":
      return projectReport();
    case "equipment_calibration":
      return equipmentReport();
  }
}
