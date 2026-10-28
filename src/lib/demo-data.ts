import { prisma } from "@/lib/prisma";
import { standardShare } from "@/lib/project-monitoring-shared";
import { getJakartaToday } from "@/lib/status";
import { isoWeekKey } from "@/lib/week";
import { computeMonitoring } from "@/lib/project-monitoring-shared";
import { analyzeMargin } from "@/lib/project-margin";
import { MONITORING_INCLUDE, getMonitoringThresholds, toMonitoringInput } from "@/lib/project-monitoring";
import type { RabData } from "@/lib/project-rab-import";

/**
 * Demo data for the Project module, so the dashboard, reports and charts can be
 * tried without real data. Everything created here is recognisable and removable:
 *  - projects numbered "DEMO-…" (deleting them removes all their child data)
 *  - employees with an "@contoh.demo" email
 *  - the category "Contoh (Demo)" and certification category "Sertifikasi (Contoh)"
 */

export const DEMO_PREFIX = "DEMO-";
const DEMO_EMAIL = "@contoh.demo";
const DEMO_CATEGORY = "Contoh (Demo)";
const DEMO_CERT_CATEGORY = "Sertifikasi (Contoh)";
const DAY = 86400000;

type Scenario = {
  no: string;
  name: string;
  client: string;
  location: string;
  pic: string;
  value: number;
  startDaysAgo: number;
  durationDays: number;
  /** realised progress today (%) */
  actual: number;
  /** days since the last progress report */
  staleDays: number;
  /** RAB as share of contract (null = no RAB uploaded yet) */
  rabRatio: number | null;
  /** routine cost per unit of earned value (1 = exactly per RAB) */
  costFactor: number;
  delayCost?: number;
  extraCost?: number;
  /** terms: [share, status] — status follows progress when omitted */
  terms: [number, "PLANNED" | "INVOICED" | "PAID" | "OVERDUE"][];
  issues?: { title: string; impact: "LOW" | "MEDIUM" | "HIGH"; type?: "ISSUE" | "RISK" }[];
  status?: "ONGOING" | "COMPLETED";
  team: [number, string][]; // [employee index, role]
  scopes: string[];
};

const PEOPLE = [
  ["Ahmad Rifai", "Surveyor Senior"],
  ["Siti Nurhaliza", "Auditor SMK3"],
  ["Bambang Wijaya", "Inspektur"],
  ["Dewi Lestari", "Tenaga Ahli Geodesi"],
  ["Rudi Hartono", "Inspektur NDT"],
  ["Maya Sari", "Analis Laboratorium"],
  ["Fajar Nugroho", "Auditor TKDN"],
  ["Rina Saputri", "Koordinator Project"],
] as const;

const SCENARIOS: Scenario[] = [
  {
    no: "DEMO-01",
    name: "Survey Topografi Lokasi Bor Wilayah Kerja Pertamina EP Zona 4",
    client: "PT Pertamina EP",
    location: "Sumatera Selatan",
    pic: "Farakhan S. Barchia",
    value: 14_562_975_000,
    startDaysAgo: 210,
    durationDays: 290,
    actual: 56,
    staleDays: 9,
    rabRatio: 0.8,
    costFactor: 1.04,
    delayCost: 420_000_000,
    terms: [[0.3, "PAID"], [0.3, "OVERDUE"], [0.4, "PLANNED"]],
    issues: [
      { title: "Izin kerja area sumur PDM-12 belum terbit", impact: "HIGH" },
      { title: "Curah hujan tinggi berpotensi menunda pengukuran drone", impact: "MEDIUM", type: "RISK" },
    ],
    team: [[0, "Ketua Tim"], [3, "Tenaga Ahli Geodesi"], [7, "Koordinator Project"]],
    scopes: ["Survey pendahuluan", "Pemasangan patok Bench Mark", "Pengukuran KKH/KKV dan situasi", "Survey drone LiDAR dan fotogrametri", "Pelaporan hasil survey"],
  },
  {
    no: "DEMO-02",
    name: "Sertifikasi SMK3 Pabrik Gresik",
    client: "PT Semen Indonesia",
    location: "Gresik, Jawa Timur",
    pic: "Rina Saputri",
    value: 850_000_000,
    startDaysAgo: 95,
    durationDays: 130,
    actual: 76,
    staleDays: 3,
    rabRatio: 0.7,
    costFactor: 1.18,
    extraCost: 35_000_000,
    terms: [[0.4, "PAID"], [0.6, "PLANNED"]],
    issues: [{ title: "Dokumen prosedur tanggap darurat belum lengkap", impact: "MEDIUM" }],
    team: [[1, "Lead Auditor"], [7, "Auditor"]],
    scopes: ["Kick-off dan tinjauan dokumen", "Audit tahap 1", "Audit tahap 2", "Laporan dan rekomendasi", "Penerbitan sertifikat"],
  },
  {
    no: "DEMO-03",
    name: "Survei Batimetri Pelabuhan Tanjung Priok",
    client: "PT Pelabuhan Indonesia (Persero)",
    location: "Jakarta Utara",
    pic: "Budi Hartono",
    value: 3_150_000_000,
    startDaysAgo: 120,
    durationDays: 210,
    actual: 62,
    staleDays: 2,
    rabRatio: 0.82,
    costFactor: 0.95,
    terms: [[0.3, "PAID"], [0.3, "INVOICED"], [0.4, "PLANNED"]],
    team: [[0, "Surveyor"], [3, "Tenaga Ahli"]],
    scopes: ["Mobilisasi kapal survei", "Akuisisi data multibeam", "Pengolahan data", "Peta batimetri", "Laporan akhir"],
  },
  {
    no: "DEMO-04",
    name: "Verifikasi TKDN Komponen Smelter",
    client: "PT Freeport Indonesia",
    location: "Gresik, Jawa Timur",
    pic: "Dewi Anggraini",
    value: 1_200_000_000,
    startDaysAgo: 60,
    durationDays: 185,
    actual: 27,
    staleDays: 4,
    rabRatio: 0.65,
    costFactor: 0.98,
    terms: [[0.2, "PAID"], [0.4, "PLANNED"], [0.4, "PLANNED"]],
    team: [[6, "Ketua Tim"], [5, "Verifikator"]],
    scopes: ["Pengumpulan data BOM", "Verifikasi lapangan", "Perhitungan nilai TKDN", "Laporan verifikasi", "Penerbitan sertifikat TKDN"],
  },
  {
    no: "DEMO-05",
    name: "Inspeksi Tangki Timbun Terminal BBM Plumpang",
    client: "PT Pertamina Patra Niaga",
    location: "Jakarta Utara",
    pic: "Andi Pratama",
    value: 640_000_000,
    startDaysAgo: 30,
    durationDays: 100,
    actual: 12,
    staleDays: 18,
    rabRatio: null,
    costFactor: 1,
    terms: [],
    issues: [{ title: "Jadwal pengosongan tangki T-07 belum dikonfirmasi klien", impact: "HIGH" }],
    team: [[4, "Inspektur NDT"], [2, "Inspektur"]],
    scopes: ["Persiapan dan izin kerja", "Inspeksi visual", "Pengujian ketebalan (UT)", "Laporan inspeksi"],
  },
  {
    no: "DEMO-06",
    name: "Audit Energi Gedung Kantor Pusat",
    client: "PT PLN (Persero)",
    location: "Jakarta Selatan",
    pic: "Rudi Hartono",
    value: 420_000_000,
    startDaysAgo: 110,
    durationDays: 125,
    actual: 88,
    staleDays: 5,
    rabRatio: 0.72,
    costFactor: 1.02,
    terms: [[0.5, "PAID"], [0.3, "OVERDUE"], [0.2, "PLANNED"]],
    team: [[2, "Auditor Energi"]],
    scopes: ["Walk-through audit", "Pengukuran beban listrik", "Analisis peluang hemat energi", "Laporan audit energi"],
  },
  {
    no: "DEMO-07",
    name: "Kalibrasi Alat Ukur Laboratorium QC",
    client: "PT Kalbe Farma Tbk",
    location: "Bekasi, Jawa Barat",
    pic: "Maya Sari",
    value: 280_000_000,
    startDaysAgo: 150,
    durationDays: 90,
    actual: 100,
    staleDays: 55,
    rabRatio: 0.68,
    costFactor: 1,
    terms: [[0.5, "PAID"], [0.5, "INVOICED"]],
    status: "COMPLETED",
    team: [[5, "Analis Kalibrasi"]],
    scopes: ["Inventarisasi alat", "Kalibrasi di tempat", "Penerbitan sertifikat kalibrasi"],
  },
  {
    no: "DEMO-08",
    name: "Pengawasan Mutu Konstruksi Jalan Tol Seksi 3",
    client: "PT Jasa Marga (Persero) Tbk",
    location: "Jawa Tengah",
    pic: "Fajar Nugroho",
    value: 2_400_000_000,
    startDaysAgo: 75,
    durationDays: 365,
    actual: 15,
    staleDays: 6,
    rabRatio: 0.78,
    costFactor: 1.0,
    terms: [[0.15, "PAID"], [0.35, "PLANNED"], [0.5, "PLANNED"]],
    team: [[2, "Inspektur Mutu"], [0, "Surveyor"], [7, "Koordinator Project"]],
    scopes: ["Pengujian material", "Pengawasan pekerjaan tanah", "Pengawasan perkerasan", "Laporan bulanan mutu"],
  },
];

// RAB composition (share of total project cost) with Sucofindo account codes
const RAB_LINES: { code: string; section: string; category: string; account: string; desc: string; share: number }[] = [
  { code: "I", section: "Beban Personil / Tenaga Kerja Langsung", category: "Personil / Tenaga Kerja Langsung", account: "4151", desc: "Upah pegawai proyek", share: 0.27 },
  { code: "I", section: "Beban Personil / Tenaga Kerja Langsung", category: "Personil / Tenaga Kerja Langsung", account: "4153", desc: "Tunjangan pegawai proyek", share: 0.06 },
  { code: "III", section: "Beban Perjalanan Dinas", category: "Perjalanan Dinas", account: "4302", desc: "Biaya SPPD dalam negeri", share: 0.07 },
  { code: "IV", section: "Beban Operasional", category: "Operasional", account: "4411", desc: "Biaya bahan", share: 0.06 },
  { code: "IV", section: "Beban Operasional", category: "Operasional", account: "4421", desc: "Beban kerja sama / kemitraan", share: 0.25 },
  { code: "IV", section: "Beban Operasional", category: "Operasional", account: "4433", desc: "Uang makan", share: 0.04 },
  { code: "V", section: "Beban Fasilitas", category: "Fasilitas", account: "4542", desc: "Sewa kendaraan operasional", share: 0.13 },
  { code: "V", section: "Beban Fasilitas", category: "Fasilitas", account: "4545", desc: "BBM dan pelumas", share: 0.04 },
  { code: "VII", section: "Beban Kantor & Diklat", category: "Kantor & Diklat", account: "4711", desc: "Alat tulis dan cetakan", share: 0.02 },
  { code: "VII", section: "Beban Kantor & Diklat", category: "Kantor & Diklat", account: "4731", desc: "Rapat koordinasi", share: 0.06 },
];

const day = (t: number) => new Date(t);
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);
const round = (v: number) => Math.round(v / 1000) * 1000;

export async function hasDemoData() {
  return (await prisma.project.count({ where: { projectNumber: { startsWith: DEMO_PREFIX } } })) > 0;
}

export async function removeDemoData() {
  const projects = await prisma.project.findMany({ where: { projectNumber: { startsWith: DEMO_PREFIX } }, select: { id: true } });
  const ids = projects.map((p) => p.id);
  // child rows without cascade first
  await prisma.emailLog.deleteMany({ where: { projectId: { in: ids } } }).catch(() => undefined);
  await prisma.notification.deleteMany({ where: { projectId: { in: ids } } }).catch(() => undefined);
  await prisma.projectAddendum.deleteMany({ where: { projectId: { in: ids } } }).catch(() => undefined);
  await prisma.project.deleteMany({ where: { id: { in: ids } } });
  const emps = await prisma.employee.findMany({ where: { email: { endsWith: DEMO_EMAIL } }, select: { id: true } });
  const empIds = emps.map((e) => e.id);
  await prisma.personnelCertification.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.projectAssignment.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.employee.deleteMany({ where: { id: { in: empIds } } });
  await prisma.projectCategory.deleteMany({ where: { name: DEMO_CATEGORY, projects: { none: {} } } });
  await prisma.personnelCertificationCategory.deleteMany({ where: { name: DEMO_CERT_CATEGORY, certifications: { none: {} } } });
  return projects.length;
}

export async function createDemoData(actor: string) {
  await removeDemoData(); // also clears leftovers (e.g. demo employees whose projects were deleted by hand)
  const today = getJakartaToday().getTime();

  const category = await prisma.projectCategory.upsert({ where: { name: DEMO_CATEGORY }, update: {}, create: { name: DEMO_CATEGORY } });
  const certCat = await prisma.personnelCertificationCategory.upsert({ where: { name: DEMO_CERT_CATEGORY }, update: {}, create: { name: DEMO_CERT_CATEGORY } });

  const employees: { id: string }[] = [];
  for (const [i, [name, position]] of PEOPLE.entries()) {
    employees.push(
      await prisma.employee.create({
        data: { name, position, email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}${DEMO_EMAIL}`, employeeId: `DEMO-${String(i + 1).padStart(3, "0")}` },
      })
    );
  }
  // certificates: one expired while on duty, one expiring during the assignment, the rest safe
  await prisma.personnelCertification.createMany({
    data: [
      { employeeId: employees[3].id, categoryId: certCat.id, certificationName: "Surveyor Kadaster Berlisensi", expiryDate: day(today - 6 * DAY) },
      { employeeId: employees[0].id, categoryId: certCat.id, certificationName: "Operator Drone (Remote Pilot)", expiryDate: day(today + 24 * DAY) },
      { employeeId: employees[4].id, categoryId: certCat.id, certificationName: "NDT Level II - Ultrasonic", expiryDate: day(today + 400 * DAY) },
      { employeeId: employees[1].id, categoryId: certCat.id, certificationName: "Auditor SMK3", expiryDate: day(today + 300 * DAY) },
    ],
  });

  for (const sc of SCENARIOS) {
    const start = today - sc.startDaysAgo * DAY;
    const end = start + sc.durationDays * DAY;
    const completed = sc.status === "COMPLETED";
    const budget = sc.rabRatio ? round(sc.value * sc.rabRatio) : 0;
    const contingency = sc.rabRatio ? round(sc.value * 0.005) : 0;
    const projectCost = budget - contingency;
    const marginPct = sc.rabRatio ? Math.round(((sc.value - budget) / sc.value) * 10000) / 100 : null;

    const project = await prisma.project.create({
      data: {
        projectNumber: sc.no,
        projectName: sc.name,
        categoryId: category.id,
        clientName: sc.client,
        pic: sc.pic,
        contractValue: sc.value,
        startDate: day(start),
        targetEndDate: day(end),
        actualEndDate: completed ? day(end - 5 * DAY) : null,
        status: sc.status ?? "ONGOING",
        description: `Data contoh untuk mencoba fitur monitoring. Lokasi: ${sc.location}.`,
        targetMarginPct: marginPct,
      },
    });
    const pid = project.id;

    // progress follows an S shape up to the latest report; milestones complete on the date that curve reaches their cumulative weight
    const lastReport = today - sc.staleDays * DAY;
    const xEnd = Math.min(1, Math.max(0.05, (lastReport - start) / (sc.durationDays * DAY)));
    const reportedAt = (f: number) => (sc.actual * standardShare(f * xEnd)) / standardShare(xEnd);
    const reachedOn = (value: number) => {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (reportedAt(mid) < value) lo = mid;
        else hi = mid;
      }
      return start + (lastReport - start) * hi;
    };

    // milestones: equal-ish weights over the scope list, done up to the current progress
    const weights = sc.scopes.map((_, i, a) => (i === a.length - 1 ? 100 - Math.floor(100 / a.length) * (a.length - 1) : Math.floor(100 / a.length)));
    let cum = 0;
    await prisma.projectMilestone.createMany({
      data: sc.scopes.map((name, i) => {
        const from = cum;
        cum += weights[i];
        const planned = start + sShareInverse(cum / 100) * sc.durationDays * DAY;
        const done = sc.actual >= cum - 0.01;
        const running = !done && sc.actual > from;
        return {
          projectId: pid,
          sequence: i + 1,
          name,
          weight: weights[i],
          plannedDate: day(planned),
          actualDate: done ? day(Math.min(lastReport, reachedOn(cum))) : null,
          status: done ? "DONE" : running ? "IN_PROGRESS" : "PENDING",
        };
      }),
    });

    // progress reports: six steps up to today's value, following an S shape like real work
    const steps = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
    await prisma.projectProgressReport.createMany({
      data: steps.map((f, i) => ({
        projectId: pid,
        reportDate: day(start + (lastReport - start) * f),
        actualPercent: Math.round(reportedAt(f) * 10) / 10,
        summary: i === steps.length - 1 ? `Progres ${sc.actual}%: ${sc.scopes[Math.min(sc.scopes.length - 1, Math.floor((sc.actual / 100) * sc.scopes.length))].toLowerCase()} berjalan.` : `Pekerjaan berjalan sesuai tahapan (${Math.round(sc.actual * f)}%).`,
        createdBy: i === steps.length - 1 ? `${sc.pic} (PIC)` : actor,
      })),
    });

    // payment terms
    let seq = 0;
    await prisma.projectTerm.createMany({
      data: sc.terms.map(([share, st], i) => {
        seq += 1;
        const amount = round(sc.value * share);
        const invoiceAt = start + ((i + 1) / (sc.terms.length + 0.5)) * (today - start);
        const base = { projectId: pid, sequence: seq, name: i === 0 && sc.terms.length > 2 ? `Uang muka (${Math.round(share * 100)}%)` : `Termin ${i + 1} (${Math.round(share * 100)}%)`, percent: share * 100, amount };
        if (st === "PAID") return { ...base, status: "PAID", invoiceNumber: `INV/${sc.no}/${i + 1}`, invoiceDate: day(invoiceAt), dueDate: day(invoiceAt + 30 * DAY), paidDate: day(invoiceAt + 25 * DAY), paidAmount: amount };
        if (st === "OVERDUE") return { ...base, status: "INVOICED", invoiceNumber: `INV/${sc.no}/${i + 1}`, invoiceDate: day(today - 55 * DAY), dueDate: day(today - 25 * DAY) };
        if (st === "INVOICED") return { ...base, status: "INVOICED", invoiceNumber: `INV/${sc.no}/${i + 1}`, invoiceDate: day(today - 12 * DAY), dueDate: day(today + 18 * DAY) };
        return { ...base, status: "PLANNED", plannedDate: day(Math.min(end, today + (i + 1) * 30 * DAY)), requirement: `Progres ${Math.round(((i + 1) / sc.terms.length) * 100)}% dan BAPP ditandatangani` };
      }),
    });

    // RAB (lines + one saved revision so the RAB card and details show)
    if (sc.rabRatio) {
      const items = RAB_LINES.map((l) => ({ ...l, amount: round(projectCost * l.share) }));
      await prisma.projectBudgetItem.createMany({
        data: [
          ...items.map((l) => ({ projectId: pid, category: l.category, description: l.desc, accountCode: l.account, amount: l.amount })),
          { projectId: pid, category: "Biaya Tak Terduga", description: "Biaya tak terduga (0,5% dari pendapatan)", amount: contingency },
        ],
      });
      const itemsTotal = items.reduce((a, b) => a + b.amount, 0);
      const sections = [...new Set(items.map((i) => i.code))].map((code) => {
        const its = items.filter((i) => i.code === code);
        return { code, name: its[0].section, category: its[0].category, total: its.reduce((a, b) => a + b.amount, 0), items: its.length };
      });
      const rab: RabData = {
        project: {
          contractNumber: sc.no,
          name: sc.name,
          client: sc.client,
          location: sc.location,
          unit: "Cabang Jakarta",
          portfolio: "Contoh",
          subPortfolio: null,
          serviceType: null,
          pmu: null,
          responsible: sc.pic,
          projectManager: sc.pic,
          accountPartner: null,
          financePic: null,
          paymentScheme: "Progress Basis",
          durationMonths: Math.round(sc.durationDays / 30),
          startDate: ymd(start),
          endDate: ymd(end),
          objective: sc.name,
        },
        scopes: sc.scopes.map((s, i) => ({ no: i + 1, scope: s, deliverable: `Laporan ${s.toLowerCase()}` })),
        team: sc.team.map(([e, role]) => ({ group: "Tim pelaksana", position: role, count: 1, months: Math.round(sc.durationDays / 30) })),
        teamTotal: sc.team.length,
        sections,
        items: items.map((l) => ({ section: l.code, account: l.account, code: l.code, fv: "V", description: l.desc, qty: 1, unit: "paket", unitPrice: l.amount, amount: l.amount })),
        revenue: sc.value,
        projectCost: itemsTotal,
        contingency,
        contingencyPct: 0.5,
        operatingCost: itemsTotal + contingency,
        overhead: round(sc.value * 0.04),
        overheadPct: 4,
        operatingProfit: sc.value - itemsTotal - contingency,
        marginPct,
        years: (() => {
          // RAB split per calendar year, proportional to the days of the project in that year
          const out: { label: string; revenue: number; cost: number; profit: number; marginPct: number | null }[] = [];
          const y0 = new Date(start).getUTCFullYear();
          const y1 = new Date(end).getUTCFullYear();
          for (let y = y0; y <= y1; y++) {
            const a = Math.max(start, Date.UTC(y, 0, 1));
            const b = Math.min(end, Date.UTC(y + 1, 0, 1));
            const f = (b - a) / (end - start);
            const rev = round(sc.value * f);
            const cost = round((itemsTotal + contingency) * f * (y === y1 && y1 > y0 ? 1.12 : y1 > y0 ? 0.95 : 1));
            out.push({ label: `Tahun ${y - y0 + 1}`, revenue: rev, cost, profit: rev - cost, marginPct: rev ? Math.round(((rev - cost) / rev) * 1000) / 10 : null });
          }
          return out;
        })(),
        warnings: [],
      };
      await prisma.projectRabRevision.create({
        data: {
          projectId: pid,
          version: 0,
          fileName: `RAB ${sc.no} (contoh).xlsm`,
          contractValue: sc.value,
          projectCost: itemsTotal,
          contingency,
          totalCost: itemsTotal + contingency,
          overhead: rab.overhead,
          operatingProfit: rab.operatingProfit,
          marginPct,
          dataJson: JSON.stringify(rab),
          createdBy: actor,
        },
      });
      await prisma.project.update({
        where: { id: pid },
        data: { baselineLockedAt: day(start), baselineLockedBy: actor, baselineContractValue: sc.value, baselineBudget: itemsTotal + contingency, baselineEndDate: day(end) },
      });

      // actual costs: routine costs following progress (monthly), plus one-offs
      const routine = (itemsTotal + contingency) * (sc.actual / 100) * sc.costFactor;
      const months = Math.max(1, Math.ceil((today - start) / (30 * DAY)));
      const lines = RAB_LINES.filter((l) => l.share >= 0.04);
      const share = lines.reduce((a, b) => a + b.share, 0);
      const expenses: { projectId: string; expenseDate: Date; category: string; description: string; amount: number; cause: string; referenceNo: string; createdBy: string }[] = [];
      for (let mth = 0; mth < months; mth++) {
        const t = Math.min(today - DAY, start + (mth + 0.6) * 30 * DAY);
        for (const l of lines)
          expenses.push({
            projectId: pid,
            expenseDate: day(t),
            category: l.category,
            description: `${l.desc} bulan ke-${mth + 1}`,
            amount: round((routine * (l.share / share)) / months),
            cause: "NORMAL",
            referenceNo: `BKK/${sc.no}/${mth + 1}${l.account}`,
            createdBy: `${actor} (data contoh)`,
          });
      }
      if (sc.delayCost)
        expenses.push({ projectId: pid, expenseDate: day(today - 20 * DAY), category: "Fasilitas", description: "Perpanjangan sewa kendaraan karena cuaca dan izin", amount: sc.delayCost, cause: "DELAY", referenceNo: `BKK/${sc.no}/D1`, createdBy: `${actor} (data contoh)` });
      if (sc.extraCost)
        expenses.push({ projectId: pid, expenseDate: day(today - 15 * DAY), category: "Operasional", description: "Audit tambahan unit pengantongan (di luar kontrak)", amount: sc.extraCost, cause: "EXTRA_SCOPE", referenceNo: `BKK/${sc.no}/E1`, createdBy: `${actor} (data contoh)` });
      await prisma.projectExpense.createMany({ data: expenses });
    }

    if (sc.issues?.length)
      await prisma.projectIssue.createMany({
        data: sc.issues.map((x) => ({ projectId: pid, title: x.title, impact: x.impact, type: x.type ?? "ISSUE", owner: sc.pic, targetDate: day(today + 10 * DAY), createdBy: actor })),
      });

    await prisma.projectAssignment.createMany({
      data: sc.team.map(([e, role]) => ({ projectId: pid, employeeId: employees[e].id, role })),
      skipDuplicates: true,
    });

    if (completed) await prisma.projectCloseout.create({ data: { projectId: pid, bappDate: day(end - 5 * DAY), satisfaction: 4, updatedBy: actor } }).catch(() => undefined);
  }

  await backfillSnapshots(today);
  return SCENARIOS.length;
}

/** Six weeks of history for the demo projects, computed from the data as it stood each week. */
async function backfillSnapshots(today: number) {
  const thresholds = await getMonitoringThresholds();
  const projects = await prisma.project.findMany({ where: { projectNumber: { startsWith: DEMO_PREFIX }, status: "ONGOING" }, include: MONITORING_INCLUDE });
  const rows = [];
  for (const p of projects) {
    const full = toMonitoringInput(p);
    for (let w = 6; w >= 1; w--) {
      const t = today - w * 7 * DAY;
      if (t < (full.startDate ?? t)) continue;
      const input = { ...full, reports: full.reports.filter((r) => r.reportDate <= t), expenses: full.expenses.filter((e) => (e.date ?? 0) <= t) };
      const s = computeMonitoring(input, t, thresholds);
      const m = analyzeMargin(input, s, t, thresholds.marginDropAlert);
      rows.push({
        projectId: p.id,
        weekKey: isoWeekKey(new Date(t)),
        snapshotDate: new Date(t),
        plannedPercent: s.plannedPercent,
        actualPercent: s.actualPercent,
        deviation: s.deviation,
        spi: s.spi,
        health: s.health,
        invoiced: s.invoiced,
        paid: s.paid,
        pad: s.pad,
        costActual: s.costActual,
        openIssues: s.openIssues,
        cpi: m.cpi,
        actualMarginPct: m.actualMarginPct,
        forecastMarginPct: m.hasCost ? m.forecastMarginPct : null,
        plannedMarginPct: m.plannedMarginPct,
      });
    }
  }
  if (rows.length) await prisma.projectSnapshot.createMany({ data: rows, skipDuplicates: true });
}

export type DemoSeedResult = { state: "exists" | "seeded" | "removed" | "busy" | "error"; message?: string };

/**
 * Makes sure the demo projects are there, automatically, on any Project page.
 *  - already present → nothing to do
 *  - removed on purpose by an admin (audit log) → never re-created
 *  - otherwise create them; a short-lived lock (AppSettings.demoDataSeededAt)
 *    stops two simultaneous visits from seeding twice. If seeding fails the
 *    lock is released so the next visit tries again, and the reason is returned
 *    so the page can show it.
 */
export async function ensureDemoDataOnce(): Promise<DemoSeedResult> {
  try {
    if (await hasDemoData()) {
      // demo data from an older version (plain straight-line progress) is refreshed once to the current shape
      const first = await prisma.project.findFirst({ where: { projectNumber: "DEMO-01", deletedAt: null }, select: { _count: { select: { progressReports: true } } } });
      if (!first || first._count.progressReports >= 6) return { state: "exists" };
    } else {
      const removed = await prisma.auditLog.findFirst({
        where: { entityType: "ProjectMonitoring", action: "DELETE", description: { contains: "data contoh" } },
        select: { id: true },
      });
      if (removed) return { state: "removed" };
    }
  } catch (e) {
    console.error("demo data check failed", e);
    return { state: "error", message: "Data contoh tidak dapat diperiksa." };
  }

  let locked = false;
  try {
    await prisma.appSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
    const staleBefore = new Date(Date.now() - 2 * 60 * 1000);
    const claimed = await prisma.appSettings.updateMany({
      where: { id: "default", OR: [{ demoDataSeededAt: null }, { demoDataSeededAt: { lt: staleBefore } }] },
      data: { demoDataSeededAt: new Date() },
    });
    if (claimed.count === 0) return { state: "busy" };
    locked = true;
    await createDemoData("Sistem");
    return { state: "seeded" };
  } catch (e) {
    console.error("demo data seeding failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (locked) await prisma.appSettings.updateMany({ where: { id: "default" }, data: { demoDataSeededAt: null } }).catch(() => undefined);
    if (/demoDataSeededAt|column .* does not exist|P2022/i.test(msg))
      return { state: "error", message: "Struktur database belum diperbarui. Jalankan \"npx prisma migrate deploy\" lalu muat ulang halaman ini." };
    return { state: "error", message: `Data contoh gagal dibuat: ${msg.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 200) ?? "kesalahan tidak diketahui"}` };
  }
}

/** Fraction of the duration at which a standard S-curve reaches the given share of work. */
function sShareInverse(share: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (standardShare(mid) < share) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
