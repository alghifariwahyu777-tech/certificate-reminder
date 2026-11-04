/**
 * Who may change what. One table for the whole system: every API guard, every
 * page and every button reads from here, so a change of policy is made once.
 *
 * Everyone who can log in to the internal app can SEE everything (that is how
 * the departments stay informed about each other); the roles differ only in
 * what they may CHANGE. A Project Manager may change every part of every
 * project; the other departments work across all projects within their own area.
 */

export type Role = "ADMIN" | "MANAGEMENT" | "PM" | "QHSE" | "HC" | "FINANCE" | "VIEWER" | "PIC";

/** Roles an Admin can assign in the user screen, in display order. PIC accounts are created from the project's PIC email. */
export const ASSIGNABLE_ROLES = ["ADMIN", "MANAGEMENT", "PM", "QHSE", "HC", "FINANCE", "VIEWER"] as const;

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  MANAGEMENT: "Manajemen",
  PM: "Project Manager",
  QHSE: "QHSE",
  HC: "Human Capital",
  FINANCE: "Keuangan",
  VIEWER: "Viewer",
  PIC: "PIC lapangan",
};

/** One line per role: what that person does in the system. Shown in the user screen and the guide. */
export const ROLE_DUTY: Record<Role, string> = {
  ADMIN: "Mengelola seluruh data, pengguna, dan pengaturan sistem.",
  MANAGEMENT: "Memantau seluruh data dan laporan mingguan, mengambil keputusan. Tidak mengubah data.",
  PM: "Mengelola seluruh project: data project, RAB, jadwal, milestone, progres, biaya, termin, kendala, HSE, dan tim.",
  QHSE: "Mengisi laporan HSE bulanan, mengelola risiko dan kendala di semua project, serta kalibrasi alat.",
  HC: "Mengelola data karyawan dan sertifikasinya, serta penugasan personil ke project.",
  FINANCE: "Mengelola termin, invoice, pembayaran, RAB, dan realisasi biaya semua project.",
  VIEWER: "Hanya melihat dan mengunduh data.",
  PIC: "Memperbarui progres project yang menjadi tanggung jawabnya melalui halaman PIC.",
};

/** Areas of data. Each area has its own list of roles that may change it. */
export type Area =
  | "client" // sertifikat klien, permohonan, klien, layanan, jenis dokumen, kategori dan template email sertifikat
  | "personnel" // karyawan, sertifikasi personil, kategori dan template email personil
  | "equipment" // alat, kategori dan template email kalibrasi
  | "project" // data project, kategori project, jadwal, milestone, progres, addendum, baseline, penutupan
  | "projectCost" // RAB dan realisasi biaya
  | "projectBilling" // termin, invoice, pembayaran
  | "projectRisk" // kendala dan risiko
  | "projectHse" // laporan HSE bulanan
  | "projectTeam" // penugasan personil ke project
  | "system"; // pengguna, atasan, divisi, pengaturan, log audit, sampah, data contoh, pengiriman laporan

export const AREA_LABEL: Record<Area, string> = {
  client: "Sertifikat klien dan permohonan",
  personnel: "Karyawan dan sertifikasi personil",
  equipment: "Kalibrasi alat",
  project: "Data, jadwal, dan progres project",
  projectCost: "RAB dan biaya project",
  projectBilling: "Termin dan pembayaran",
  projectRisk: "Kendala dan risiko",
  projectHse: "Laporan HSE",
  projectTeam: "Penugasan personil",
  system: "Pengguna dan pengaturan",
};

const MATRIX: Record<Area, readonly Role[]> = {
  client: ["ADMIN"],
  personnel: ["ADMIN", "HC"],
  equipment: ["ADMIN", "QHSE"],
  project: ["ADMIN", "PM"],
  projectCost: ["ADMIN", "PM", "FINANCE"],
  projectBilling: ["ADMIN", "PM", "FINANCE"],
  projectRisk: ["ADMIN", "PM", "QHSE"],
  projectHse: ["ADMIN", "PM", "QHSE"],
  projectTeam: ["ADMIN", "PM", "HC"],
  system: ["ADMIN"],
};

export const ALL_AREAS = Object.keys(MATRIX) as Area[];

export function rolesFor(area: Area): readonly Role[] {
  return MATRIX[area];
}

/** May this role change data in this area (ignoring project ownership)? */
export function can(role: string | null | undefined, area: Area): boolean {
  return !!role && (MATRIX[area] as readonly string[]).includes(role);
}

/** Does the role change anything at all (used for uploads and "add" buttons that are shared)? */
export function canWriteAnything(role: string | null | undefined): boolean {
  return ALL_AREAS.some((a) => can(role, a));
}

export function isProjectOwner(email: string | null | undefined, project: { picEmail?: string | null }): boolean {
  return !!email && !!project.picEmail && project.picEmail.trim().toLowerCase() === email.trim().toLowerCase();
}

/**
 * May this user change this area of this project? Rights are per area, the
 * same for every project (kept per project so a narrower rule, e.g. "only the
 * projects I lead", can be added here later without touching the callers).
 */
export function canEditProject(
  user: { role: string; email: string } | null | undefined,
  _project: { picEmail?: string | null },
  area: Area
): boolean {
  return !!user && can(user.role, area);
}

/** Per-area edit rights for one project, for the project page and its panels. */
export type ProjectRights = Record<"project" | "projectCost" | "projectBilling" | "projectRisk" | "projectHse" | "projectTeam", boolean>;

export function projectRights(user: { role: string; email: string } | null | undefined, project: { picEmail?: string | null }): ProjectRights {
  return {
    project: canEditProject(user, project, "project"),
    projectCost: canEditProject(user, project, "projectCost"),
    projectBilling: canEditProject(user, project, "projectBilling"),
    projectRisk: canEditProject(user, project, "projectRisk"),
    projectHse: canEditProject(user, project, "projectHse"),
    projectTeam: canEditProject(user, project, "projectTeam"),
  };
}

export function deniedMessage(area: Area): string {
  const who = MATRIX[area].map((r) => ROLE_LABEL[r]).join(", ");
  return `Bagian "${AREA_LABEL[area]}" hanya dapat diubah oleh ${who}.`;
}
