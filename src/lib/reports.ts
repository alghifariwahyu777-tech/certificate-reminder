import { prisma } from "@/lib/prisma";
import { getCertificateStatus, getDaysRemaining } from "@/lib/status";
import { APPLICATION_STATUS_LABELS } from "@/lib/application";
import { SURVEILLANCE_STATUS_LABELS } from "@/lib/surveillance";

export type ReportType =
  | "active"
  | "expired"
  | "expiring_soon"
  | "renewal_history"
  | "recap_department"
  | "recap_category"
  | "application_status"
  | "surveillance"
  | "sla";

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
  }
}
