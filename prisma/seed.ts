import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function yearsAgo(years: number, fromDays = 0): Date {
  const d = daysFromNow(fromDays);
  d.setFullYear(d.getFullYear() - years);
  return d;
}

async function main() {
  console.log("Seeding database...");

  // --- Admin user ---
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@certificatereminder.id" },
    update: {},
    create: {
      name: "Budi Santoso",
      email: "admin@certificatereminder.id",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  // --- Demo Viewer account (read-only access) ---
  const viewerPasswordHash = await bcrypt.hash("viewer123", 10);
  await prisma.user.upsert({
    where: { email: "viewer@certificatereminder.id" },
    update: {},
    create: {
      name: "Sri Wulandari",
      email: "viewer@certificatereminder.id",
      password: viewerPasswordHash,
      role: "VIEWER",
    },
  });

  // --- Categories ---
  const categoryNames = ["ISO", "Kalibrasi", "K3", "Pelatihan", "Legal", "Aset", "Lainnya"];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categories[name] = cat.id;
  }

  // --- Departments (internal Sucofindo divisions handling the certificate) ---
  const departmentNames = [
    "Sertifikasi Sistem Manajemen",
    "Inspeksi Teknik",
    "Laboratorium & Kalibrasi",
    "HSE",
    "Legal & Perizinan",
  ];
  const departments: Record<string, string> = {};
  for (const name of departmentNames) {
    const dept = await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
    departments[name] = dept.id;
  }

  // --- Clients (companies using Sucofindo's certification services) ---
  const clientData = [
    { name: "PT Nusantara Pangan Sejahtera", contactPerson: "Dedi Kurniawan", email: "dedi@nusantarapangan.co.id", phone: "021-5551234", address: "Kawasan Industri MM2100, Bekasi" },
    { name: "PT Baja Mitra Perkasa", contactPerson: "Lina Marlina", email: "lina@bajamitra.co.id", phone: "021-5552345", address: "Jl. Rungkut Industri, Surabaya" },
    { name: "PT Agro Lestari Indonesia", contactPerson: "Fajar Nugroho", email: "fajar@agrolestari.co.id", phone: "0274-556677", address: "Jl. Solo-Yogya KM 12, Klaten" },
    { name: "PT Petrokimia Nusantara", contactPerson: "Hendra Wijaya", email: "hendra@petrokimianusantara.co.id", phone: "031-8887766", address: "Kawasan Industri Gresik, Jawa Timur" },
    { name: "PT Tekstil Karya Abadi", contactPerson: "Rina Susanti", email: "rina@tekstilkarya.co.id", phone: "022-4443322", address: "Jl. Soekarno-Hatta, Bandung" },
    { name: "PT Energi Terbarukan Jaya", contactPerson: "Bayu Aditama", email: "bayu@energiterbarukan.co.id", phone: "021-7778899", address: "Jl. Gatot Subroto, Jakarta Selatan" },
  ];
  const clients: Record<string, string> = {};
  for (const c of clientData) {
    const client = await prisma.client.upsert({ where: { name: c.name }, update: {}, create: c });
    clients[c.name] = client.id;
  }

  // --- Demo Client Portal login (for the first client, so /portal is testable) ---
  const portalPasswordHash = await bcrypt.hash("portal123", 10);
  await prisma.clientUser.upsert({
    where: { email: "portal@nusantarapangan.co.id" },
    update: {},
    create: {
      clientId: clients["PT Nusantara Pangan Sejahtera"],
      name: "Dedi Kurniawan",
      email: "portal@nusantarapangan.co.id",
      password: portalPasswordHash,
    },
  });

  // --- Certificates ---
  const certificates = [
    {
      certificateNumber: "ISO-9001-2023-001",
      certificateName: "ISO 9001:2015 Quality Management System",
      category: "ISO",
      department: "Sertifikasi Sistem Manajemen",
      client: "PT Nusantara Pangan Sejahtera",
      issuingBody: "Sucofindo International Certification Services",
      issueDate: yearsAgo(2, -15),
      validFrom: yearsAgo(2, -15),
      expiryDate: daysFromNow(400),
      storageLocation: "Arsip Digital - Folder ISO/2023",
      pic: "Budi Santoso",
      picEmail: "budi.santoso@sucofindo.co.id",
      description: "Sertifikasi sistem manajemen mutu untuk seluruh lini produksi.",
      notes: "Audit surveillance tahunan oleh badan sertifikasi.",
    },
    {
      certificateNumber: "ISO-14001-2023-002",
      certificateName: "ISO 14001:2015 Environmental Management",
      category: "ISO",
      department: "Sertifikasi Sistem Manajemen",
      client: "PT Petrokimia Nusantara",
      issuingBody: "Sucofindo International Certification Services",
      issueDate: yearsAgo(2, -40),
      validFrom: yearsAgo(2, -40),
      expiryDate: daysFromNow(15),
      storageLocation: "Arsip Digital - Folder ISO/2023",
      pic: "Sri Wulandari",
      picEmail: "sri.wulandari@sucofindo.co.id",
      description: "Sertifikasi sistem manajemen lingkungan pabrik utama.",
      notes: "Perlu penjadwalan audit ulang sebelum expired.",
    },
    {
      certificateNumber: "ISO-45001-2022-003",
      certificateName: "ISO 45001:2018 Occupational Health & Safety",
      category: "ISO",
      department: "HSE",
      client: "PT Baja Mitra Perkasa",
      issuingBody: "Sucofindo International Certification Services",
      issueDate: yearsAgo(3),
      validFrom: yearsAgo(3),
      expiryDate: daysFromNow(-20),
      storageLocation: "Arsip Digital - Folder ISO/2022",
      pic: "Ahmad Fauzi",
      picEmail: "ahmad.fauzi@sucofindo.co.id",
      description: "Sertifikasi keselamatan dan kesehatan kerja.",
      notes: "Perlu perpanjangan segera, sudah kedaluwarsa.",
    },
    {
      certificateNumber: "CAL-TIMB-2024-004",
      certificateName: "Kalibrasi Timbangan Digital Line A",
      category: "Kalibrasi",
      department: "Laboratorium & Kalibrasi",
      client: "PT Nusantara Pangan Sejahtera",
      issuingBody: "Laboratorium Kalibrasi Sucofindo",
      issueDate: yearsAgo(1, -30),
      validFrom: yearsAgo(1, -30),
      expiryDate: daysFromNow(200),
      storageLocation: "Lemari Arsip Lt.2 - Rak B3",
      pic: "Dewi Lestari",
      picEmail: "dewi.lestari@sucofindo.co.id",
      description: "Kalibrasi rutin timbangan digital area produksi line A.",
      notes: "",
    },
    {
      certificateNumber: "CAL-TERMO-2024-005",
      certificateName: "Kalibrasi Termometer Gudang Cold Storage",
      category: "Kalibrasi",
      department: "Laboratorium & Kalibrasi",
      client: "PT Agro Lestari Indonesia",
      issuingBody: "Laboratorium Kalibrasi Sucofindo",
      issueDate: yearsAgo(1, -5),
      validFrom: yearsAgo(1, -5),
      expiryDate: daysFromNow(10),
      storageLocation: "Lemari Arsip Lt.2 - Rak B4",
      pic: "Rudi Hartono",
      picEmail: "rudi.hartono@sucofindo.co.id",
      description: "Kalibrasi termometer digital gudang penyimpanan dingin.",
      notes: "Vendor kalibrasi: Laboratorium Sucofindo Cabang Surabaya.",
    },
    {
      certificateNumber: "CAL-PRESS-2023-006",
      certificateName: "Kalibrasi Pressure Gauge Boiler",
      category: "Kalibrasi",
      department: "Laboratorium & Kalibrasi",
      client: "PT Petrokimia Nusantara",
      issuingBody: "Laboratorium Kalibrasi Sucofindo",
      issueDate: yearsAgo(1, -60),
      validFrom: yearsAgo(1, -60),
      expiryDate: daysFromNow(-5),
      storageLocation: "Lemari Arsip Lt.2 - Rak B5",
      pic: "Agus Setiawan",
      picEmail: "agus.setiawan@sucofindo.co.id",
      description: "Kalibrasi alat ukur tekanan pada unit boiler.",
      notes: "Segera jadwalkan kalibrasi ulang.",
    },
    {
      certificateNumber: "K3-OPRTR-2024-007",
      certificateName: "Sertifikat K3 Operator Forklift",
      category: "K3",
      department: "HSE",
      client: "PT Agro Lestari Indonesia",
      issuingBody: "Kementerian Ketenagakerjaan RI",
      issueDate: yearsAgo(2, -20),
      validFrom: yearsAgo(2, -20),
      expiryDate: daysFromNow(500),
      storageLocation: "Arsip Digital - Folder K3/2024",
      pic: "Joko Prasetyo",
      picEmail: "joko.prasetyo@sucofindo.co.id",
      description: "Sertifikasi kompetensi operator forklift gudang.",
      notes: "",
    },
    {
      certificateNumber: "K3-PEMADAM-2023-008",
      certificateName: "Sertifikat Ahli K3 Kebakaran",
      category: "K3",
      department: "HSE",
      client: "PT Tekstil Karya Abadi",
      issuingBody: "Kementerian Ketenagakerjaan RI",
      issueDate: yearsAgo(2),
      validFrom: yearsAgo(2),
      expiryDate: daysFromNow(25),
      storageLocation: "Arsip Digital - Folder K3/2023",
      pic: "Ahmad Fauzi",
      picEmail: "ahmad.fauzi@sucofindo.co.id",
      description: "Sertifikasi ahli K3 penanggulangan kebakaran.",
      notes: "Perpanjangan membutuhkan pelatihan ulang 3 hari.",
    },
    {
      certificateNumber: "K3-LISTRIK-2022-009",
      certificateName: "Sertifikat K3 Listrik Industri",
      category: "K3",
      department: "HSE",
      client: "PT Baja Mitra Perkasa",
      issuingBody: "Kementerian Ketenagakerjaan RI",
      issueDate: yearsAgo(3),
      validFrom: yearsAgo(3),
      expiryDate: daysFromNow(-45),
      storageLocation: "Arsip Digital - Folder K3/2022",
      pic: "Rudi Hartono",
      picEmail: "rudi.hartono@sucofindo.co.id",
      description: "Sertifikasi kompetensi K3 bidang kelistrikan.",
      notes: "Kedaluwarsa, menunggu jadwal ujian ulang.",
    },
    {
      certificateNumber: "TRN-LEAD-2024-010",
      certificateName: "Pelatihan Leadership for Supervisor",
      category: "Pelatihan",
      department: "Sertifikasi Sistem Manajemen",
      client: "PT Energi Terbarukan Jaya",
      issuingBody: "Sucofindo Training Center",
      issueDate: yearsAgo(1, -10),
      validFrom: yearsAgo(1, -10),
      expiryDate: daysFromNow(300),
      storageLocation: "Arsip Digital - Folder Pelatihan/2024",
      pic: "Sri Wulandari",
      picEmail: "sri.wulandari@sucofindo.co.id",
      description: "Program pelatihan kepemimpinan untuk level supervisor.",
      notes: "",
    },
    {
      certificateNumber: "TRN-FIRSTAID-2024-011",
      certificateName: "Pelatihan First Aid & CPR",
      category: "Pelatihan",
      department: "HSE",
      client: "PT Tekstil Karya Abadi",
      issuingBody: "Sucofindo Training Center",
      issueDate: yearsAgo(1, -50),
      validFrom: yearsAgo(1, -50),
      expiryDate: daysFromNow(28),
      storageLocation: "Arsip Digital - Folder Pelatihan/2024",
      pic: "Dewi Lestari",
      picEmail: "dewi.lestari@sucofindo.co.id",
      description: "Pelatihan pertolongan pertama dan CPR untuk tim HSE.",
      notes: "Instruktur bersertifikat Palang Merah Indonesia.",
    },
    {
      certificateNumber: "TRN-WELD-2023-012",
      certificateName: "Sertifikasi Juru Las (Welder)",
      category: "Pelatihan",
      department: "Inspeksi Teknik",
      client: "PT Baja Mitra Perkasa",
      issuingBody: "Sucofindo Training Center",
      issueDate: yearsAgo(2),
      validFrom: yearsAgo(2),
      expiryDate: daysFromNow(-10),
      storageLocation: "Arsip Digital - Folder Pelatihan/2023",
      pic: "Agus Setiawan",
      picEmail: "agus.setiawan@sucofindo.co.id",
      description: "Sertifikasi kompetensi juru las kelas 3G/4G.",
      notes: "",
    },
    {
      certificateNumber: "LGL-NIB-2021-013",
      certificateName: "Nomor Induk Berusaha (NIB)",
      category: "Legal",
      department: "Legal & Perizinan",
      client: "PT Nusantara Pangan Sejahtera",
      issuingBody: "OSS - Kementerian Investasi/BKPM",
      issueDate: yearsAgo(5),
      validFrom: yearsAgo(5),
      expiryDate: daysFromNow(900),
      storageLocation: "Arsip Digital - Folder Legal/2021",
      pic: "Budi Santoso",
      picEmail: "budi.santoso@sucofindo.co.id",
      description: "Izin usaha berbasis risiko melalui OSS.",
      notes: "",
    },
    {
      certificateNumber: "LGL-IMB-2020-014",
      certificateName: "Izin Mendirikan Bangunan Pabrik",
      category: "Legal",
      department: "Legal & Perizinan",
      client: "PT Agro Lestari Indonesia",
      issuingBody: "Dinas Penanaman Modal dan PTSP",
      issueDate: yearsAgo(6),
      validFrom: yearsAgo(6),
      expiryDate: daysFromNow(18),
      storageLocation: "Arsip Digital - Folder Legal/2020",
      pic: "Joko Prasetyo",
      picEmail: "joko.prasetyo@sucofindo.co.id",
      description: "Izin bangunan gedung produksi utama.",
      notes: "Perlu koordinasi dengan dinas terkait untuk perpanjangan.",
    },
    {
      certificateNumber: "LGL-AMDAL-2019-015",
      certificateName: "Dokumen AMDAL Operasional Pabrik",
      category: "Legal",
      department: "Legal & Perizinan",
      client: "PT Petrokimia Nusantara",
      issuingBody: "Kementerian Lingkungan Hidup dan Kehutanan",
      issueDate: yearsAgo(7),
      validFrom: yearsAgo(7),
      expiryDate: daysFromNow(-90),
      storageLocation: "Arsip Digital - Folder Legal/2019",
      pic: "Sri Wulandari",
      picEmail: "sri.wulandari@sucofindo.co.id",
      description: "Analisis mengenai dampak lingkungan operasional.",
      notes: "Kedaluwarsa, proses pembaruan sedang berjalan.",
    },
    {
      certificateNumber: "AST-GENSET-2024-016",
      certificateName: "Sertifikat Uji Kelayakan Genset",
      category: "Aset",
      department: "Inspeksi Teknik",
      client: "PT Energi Terbarukan Jaya",
      issuingBody: "Sucofindo Inspection Services",
      issueDate: yearsAgo(1, -70),
      validFrom: yearsAgo(1, -70),
      expiryDate: daysFromNow(150),
      storageLocation: "Arsip Digital - Folder Aset/2024",
      pic: "Rudi Hartono",
      picEmail: "rudi.hartono@sucofindo.co.id",
      description: "Uji kelayakan operasional genset cadangan 500 kVA.",
      notes: "",
    },
    {
      certificateNumber: "AST-LIFT-2024-017",
      certificateName: "Sertifikat Kelayakan Lift Barang",
      category: "Aset",
      department: "Inspeksi Teknik",
      client: "PT Nusantara Pangan Sejahtera",
      issuingBody: "Dinas Ketenagakerjaan Provinsi",
      issueDate: yearsAgo(1, -25),
      validFrom: yearsAgo(1, -25),
      expiryDate: daysFromNow(22),
      storageLocation: "Arsip Digital - Folder Aset/2024",
      pic: "Ahmad Fauzi",
      picEmail: "ahmad.fauzi@sucofindo.co.id",
      description: "Sertifikasi kelayakan operasional lift barang gudang.",
      notes: "Inspeksi tahunan oleh Disnaker setempat.",
    },
    {
      certificateNumber: "AST-CRANE-2023-018",
      certificateName: "Sertifikat Kelayakan Overhead Crane",
      category: "Aset",
      department: "Inspeksi Teknik",
      client: "PT Baja Mitra Perkasa",
      issuingBody: "Sucofindo Inspection Services",
      issueDate: yearsAgo(2),
      validFrom: yearsAgo(2),
      expiryDate: daysFromNow(-3),
      storageLocation: "Arsip Digital - Folder Aset/2023",
      pic: "Agus Setiawan",
      picEmail: "agus.setiawan@sucofindo.co.id",
      description: "Sertifikasi kelayakan overhead crane area produksi.",
      notes: "Segera lakukan inspeksi ulang.",
    },
    {
      certificateNumber: "OTH-HALAL-2024-019",
      certificateName: "Sertifikat Halal Produk",
      category: "Lainnya",
      department: "Sertifikasi Sistem Manajemen",
      client: "PT Agro Lestari Indonesia",
      issuingBody: "BPJPH - Badan Penyelenggara Jaminan Produk Halal",
      issueDate: yearsAgo(1, -5),
      validFrom: yearsAgo(1, -5),
      expiryDate: daysFromNow(600),
      storageLocation: "Arsip Digital - Folder Lainnya/2024",
      pic: "Dewi Lestari",
      picEmail: "dewi.lestari@sucofindo.co.id",
      description: "Sertifikasi halal untuk seluruh lini produk konsumsi.",
      notes: "",
    },
    {
      certificateNumber: "OTH-SNI-2024-020",
      certificateName: "Sertifikat Standar Nasional Indonesia (SNI)",
      category: "Lainnya",
      department: "Sertifikasi Sistem Manajemen",
      client: "PT Tekstil Karya Abadi",
      issuingBody: "Badan Standardisasi Nasional (BSN)",
      issueDate: yearsAgo(1, -15),
      validFrom: yearsAgo(1, -15),
      expiryDate: daysFromNow(7),
      storageLocation: "Arsip Digital - Folder Lainnya/2024",
      pic: "Joko Prasetyo",
      picEmail: "joko.prasetyo@sucofindo.co.id",
      description: "Sertifikasi produk sesuai Standar Nasional Indonesia.",
      notes: "Menunggu jadwal audit perpanjangan dari LSPro.",
    },
  ];

  const createdCertificates: Record<string, string> = {};
  for (const cert of certificates) {
    const { category, department, client, ...rest } = cert;
    const created = await prisma.certificate.upsert({
      where: { certificateNumber: cert.certificateNumber },
      update: {},
      create: {
        ...rest,
        categoryId: categories[category],
        departmentId: departments[department],
        clientId: clients[client],
      },
    });
    createdCertificates[cert.certificateNumber] = created.id;
  }

  // --- Example renewal history (halal certificate, renewed once in the past) ---
  const halalCertId = createdCertificates["OTH-HALAL-2024-019"];
  if (halalCertId) {
    const existingRenewal = await prisma.renewal.findFirst({ where: { certificateId: halalCertId } });
    if (!existingRenewal) {
      await prisma.renewal.create({
        data: {
          certificateId: halalCertId,
          renewalDate: yearsAgo(1, -5),
          previousNumber: "OTH-HALAL-2021-019",
          previousExpiryDate: yearsAgo(1, -5),
          newCertificateNumber: "OTH-HALAL-2024-019",
          newValidFrom: yearsAgo(1, -5),
          newExpiryDate: daysFromNow(600),
          notes: "Perpanjangan rutin 3 tahunan, tidak ada perubahan lingkup produk.",
        },
      });
    }
  }

  // --- Phase 4: Service Catalog (DocumentType, Service, ServiceRequirement, WorkflowStage) ---
  const documentTypeNames = [
    { name: "NIB", description: "Nomor Induk Berusaha" },
    { name: "Legal Document", description: "Akta pendirian & perubahan perusahaan" },
    { name: "Organization Structure", description: "Struktur organisasi perusahaan" },
    { name: "Quality Manual", description: "Dokumen manual mutu (untuk ISO)" },
    { name: "Process Flow Diagram", description: "Diagram alur proses produksi/operasional" },
  ];
  const documentTypeIds: Record<string, string> = {};
  for (const dt of documentTypeNames) {
    const created = await prisma.documentType.upsert({ where: { name: dt.name }, update: {}, create: dt });
    documentTypeIds[dt.name] = created.id;
  }

  const iso9001Service = await prisma.service.upsert({
    where: { code: "ISO-9001" },
    update: {},
    create: {
      name: "ISO 9001:2015 Quality Management System",
      code: "ISO-9001",
      description:
        "Sertifikasi sistem manajemen mutu internasional untuk organisasi yang ingin menunjukkan konsistensi kualitas produk/layanan.",
      isActive: true,
      requiresAudit: true,
      requiresSurveillance: true,
      surveillanceCount: 2,
      surveillanceIntervalMonths: 12,
      estimatedProcessingDays: 45,
    },
  });

  const halalService = await prisma.service.upsert({
    where: { code: "HALAL" },
    update: {},
    create: {
      name: "Sertifikat Halal",
      code: "HALAL",
      description: "Sertifikasi halal untuk produk konsumsi sesuai regulasi BPJPH.",
      isActive: true,
      requiresAudit: true,
      requiresSurveillance: false,
      estimatedProcessingDays: 30,
    },
  });

  const iso9001Requirements = [
    { doc: "NIB", mandatory: true, displayOrder: 0 },
    { doc: "Legal Document", mandatory: true, displayOrder: 1 },
    { doc: "Organization Structure", mandatory: true, displayOrder: 2 },
    { doc: "Quality Manual", mandatory: true, displayOrder: 3 },
    { doc: "Process Flow Diagram", mandatory: false, displayOrder: 4 },
  ];
  for (const r of iso9001Requirements) {
    await prisma.serviceRequirement.upsert({
      where: {
        serviceId_documentTypeId: { serviceId: iso9001Service.id, documentTypeId: documentTypeIds[r.doc] },
      },
      update: {},
      create: {
        serviceId: iso9001Service.id,
        documentTypeId: documentTypeIds[r.doc],
        mandatory: r.mandatory,
        displayOrder: r.displayOrder,
      },
    });
  }

  const iso9001Stages = [
    { name: "Permohonan Diterima", stageType: "APPLICATION", sequence: 1, slaDays: 1, clientDescription: "Permohonan Anda telah diterima dan sedang diverifikasi." },
    { name: "Review Dokumen", stageType: "DOCUMENT_REVIEW", sequence: 2, slaDays: 5, clientDescription: "Dokumen Anda sedang ditinjau oleh tim kami." },
    { name: "Persiapan Audit", stageType: "PREPARATION", sequence: 3, slaDays: 7, clientDescription: "Penjadwalan dan persiapan audit sedang berlangsung." },
    { name: "Pelaksanaan Audit", stageType: "AUDIT", sequence: 4, slaDays: 14, clientDescription: "Audit sedang dilaksanakan di lokasi Anda." },
    { name: "Keputusan Sertifikasi", stageType: "CERTIFICATION_DECISION", sequence: 5, slaDays: 10, clientDescription: "Hasil audit sedang direview untuk keputusan akhir." },
    { name: "Penerbitan Sertifikat", stageType: "CERTIFICATE_ISSUANCE", sequence: 6, slaDays: 5, clientDescription: "Sertifikat Anda sedang diterbitkan." },
    { name: "Selesai", stageType: "COMPLETED", sequence: 7, slaDays: null, clientDescription: "Sertifikat telah terbit dan aktif." },
  ];
  for (const s of iso9001Stages) {
    await prisma.workflowStage.upsert({
      where: { serviceId_sequence: { serviceId: iso9001Service.id, sequence: s.sequence } },
      update: {},
      create: { ...s, serviceId: iso9001Service.id, clientVisible: true },
    });
  }

  console.log(
    `Seed selesai: 1 admin, 1 viewer, 1 akun client portal, ${categoryNames.length} kategori, ${departmentNames.length} divisi, ${clientData.length} klien, ${certificates.length} sertifikat, 1 riwayat renewal, ${documentTypeNames.length} jenis dokumen, 2 layanan (${iso9001Requirements.length} persyaratan + ${iso9001Stages.length} tahap workflow untuk ISO 9001).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
