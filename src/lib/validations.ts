import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(50, "Maksimal 50 karakter"),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const certificateSchema = z
  .object({
    certificateNumber: z.string().min(1, "Nomor sertifikat wajib diisi"),
    certificateName: z.string().min(1, "Nama sertifikat wajib diisi"),
    categoryId: z.string().min(1, "Kategori wajib dipilih"),
    clientId: z.string().min(1, "Klien wajib dipilih"),
    departmentId: z.string().optional(),
    issuingBody: z.string().optional(),
    issueDate: z.string().min(1, "Tanggal terbit wajib diisi"),
    validFrom: z.string().optional(),
    expiryDate: z.string().min(1, "Tanggal expired wajib diisi"),
    storageLocation: z.string().optional(),
    pic: z.string().min(1, "PIC wajib diisi"),
    picEmail: z.string().email("Format email tidak valid").optional().or(z.literal("")),
    ccEmail: z.string().email("Format email CC tidak valid").optional().or(z.literal("")),
    description: z.string().optional(),
    notes: z.string().optional(),
    fileUrl: z.string().optional(),
    driveFileId: z.string().optional(),
    fileMimeType: z.string().optional(),
  })
  .refine((data) => new Date(data.expiryDate) > new Date(data.issueDate), {
    message: "Tanggal expired harus lebih besar dari tanggal terbit",
    path: ["expiryDate"],
  });
export type CertificateInput = z.infer<typeof certificateSchema>;

export const departmentSchema = z.object({
  name: z.string().min(1, "Nama divisi wajib diisi").max(80, "Maksimal 80 karakter"),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const renewalSchema = z
  .object({
    renewalDate: z.string().min(1, "Tanggal renewal wajib diisi"),
    newCertificateNumber: z.string().min(1, "Nomor sertifikat baru wajib diisi"),
    newValidFrom: z.string().optional(),
    newExpiryDate: z.string().min(1, "Tanggal berakhir baru wajib diisi"),
    notes: z.string().optional(),
    fileUrl: z.string().optional(),
    driveFileId: z.string().optional(),
    fileMimeType: z.string().optional(),
  })
  .refine((data) => new Date(data.newExpiryDate) > new Date(data.renewalDate), {
    message: "Tanggal berakhir baru harus lebih besar dari tanggal renewal",
    path: ["newExpiryDate"],
  });
export type RenewalInput = z.infer<typeof renewalSchema>;

export const clientSchema = z.object({
  name: z.string().min(1, "Nama perusahaan wajib diisi").max(120, "Maksimal 120 karakter"),
  contactPerson: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});
export type ClientInput = z.infer<typeof clientSchema>;

export const createUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["ADMIN", "VIEWER"], { errorMap: () => ({ message: "Role tidak valid" }) }),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  role: z.enum(["ADMIN", "VIEWER"], { errorMap: () => ({ message: "Role tidak valid" }) }),
  isActive: z.boolean(),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal("")),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const simpleTemplateSchema = z.object({
  mode: z.literal("SIMPLE"),
  subject: z.string().min(1, "Subjek wajib diisi").max(200, "Maksimal 200 karakter"),
  companyName: z.string().min(1, "Nama perusahaan wajib diisi"),
  systemName: z.string().min(1, "Nama sistem wajib diisi"),
  greeting: z.string().min(1, "Salam pembuka wajib diisi"),
  introText: z.string().min(1, "Paragraf pembuka wajib diisi"),
  closingText: z.string().min(1, "Paragraf penutup wajib diisi"),
  buttonText: z.string().min(1, "Teks tombol wajib diisi"),
  footerText: z.string().min(1, "Teks footer wajib diisi"),
});

const advancedTemplateSchema = z.object({
  mode: z.literal("ADVANCED"),
  subject: z.string().min(1, "Subjek wajib diisi").max(200, "Maksimal 200 karakter"),
  bodyHtml: z.string().min(1, "Isi template wajib diisi"),
});

export const emailTemplateSchema = z.discriminatedUnion("mode", [simpleTemplateSchema, advancedTemplateSchema]);
export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

// --- Phase 4: Service Catalog ---

export const serviceSchema = z.object({
  name: z.string().min(1, "Nama layanan wajib diisi").max(120, "Maksimal 120 karakter"),
  code: z
    .string()
    .min(1, "Kode layanan wajib diisi")
    .max(30, "Maksimal 30 karakter")
    .regex(/^[A-Za-z0-9-]+$/, "Kode hanya boleh huruf, angka, dan tanda -"),
  description: z.string().optional(),
  isActive: z.boolean(),
  requiresAudit: z.boolean(),
  requiresSurveillance: z.boolean(),
  surveillanceCount: z.coerce.number().int().min(1).max(20).optional().nullable(),
  surveillanceIntervalMonths: z.coerce.number().int().min(1).max(60).optional().nullable(),
  estimatedProcessingDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

export const documentTypeSchema = z.object({
  name: z.string().min(1, "Nama dokumen wajib diisi").max(120, "Maksimal 120 karakter"),
  description: z.string().optional(),
});
export type DocumentTypeInput = z.infer<typeof documentTypeSchema>;

export const serviceRequirementSchema = z.object({
  documentTypeId: z.string().min(1, "Jenis dokumen wajib dipilih"),
  mandatory: z.boolean(),
  allowedFileTypes: z.string().min(1, "Minimal satu tipe file"),
  maxFileSizeMB: z.coerce.number().int().min(1).max(50),
  templateUrl: z.string().optional(),
  displayOrder: z.coerce.number().int().min(0),
});
export type ServiceRequirementInput = z.infer<typeof serviceRequirementSchema>;

export const STAGE_TYPES = [
  "APPLICATION",
  "DOCUMENT_REVIEW",
  "PREPARATION",
  "AUDIT",
  "ASSESSMENT",
  "CERTIFICATION_DECISION",
  "CERTIFICATE_ISSUANCE",
  "SURVEILLANCE",
  "COMPLETED",
  "CUSTOM",
] as const;

export const workflowStageSchema = z.object({
  name: z.string().min(1, "Nama tahap wajib diisi").max(120, "Maksimal 120 karakter"),
  stageType: z.enum(STAGE_TYPES),
  sequence: z.coerce.number().int().min(1),
  slaDays: z.coerce.number().int().min(0).optional().nullable(),
  picRole: z.string().optional(),
  clientVisible: z.boolean(),
  clientDescription: z.string().optional(),
});
export type WorkflowStageInput = z.infer<typeof workflowStageSchema>;

// --- Phase 5: Application ---

export const APPLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "DOCUMENT_REVIEW",
  "REVISION_REQUIRED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
] as const;

export const applicationSchema = z.object({
  serviceId: z.string().min(1, "Layanan wajib dipilih"),
  contactName: z.string().min(1, "Nama kontak wajib diisi").max(120, "Maksimal 120 karakter"),
  contactPosition: z.string().max(120, "Maksimal 120 karakter").optional(),
  contactEmail: z.string().min(1, "Email PIC wajib diisi").email("Format email tidak valid"),
  contactPhone: z.string().max(30, "Maksimal 30 karakter").optional(),
  description: z.string().optional(),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const applicationDocumentUploadSchema = z.object({
  serviceRequirementId: z.string().min(1),
  fileUrl: z.string().min(1),
  driveFileId: z.string().min(1),
  fileMimeType: z.string().min(1),
});
export type ApplicationDocumentUploadInput = z.infer<typeof applicationDocumentUploadSchema>;

export const documentReviewSchema = z.object({
  status: z.enum(["APPROVED", "REVISION_REQUIRED"]),
  reviewComment: z.string().max(1000, "Maksimal 1000 karakter").optional(),
});
export type DocumentReviewInput = z.infer<typeof documentReviewSchema>;

export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  notes: z.string().max(1000, "Maksimal 1000 karakter").optional(),
});
export type ApplicationStatusInput = z.infer<typeof applicationStatusSchema>;

// --- Phase 6: Tracking ---

export const applicationStageSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
  picName: z.string().max(120, "Maksimal 120 karakter").optional(),
  internalNote: z.string().max(1000, "Maksimal 1000 karakter").optional(),
});
export type ApplicationStageInput = z.infer<typeof applicationStageSchema>;

// --- Phase 7: Certificate Issuance ---

export const issueCertificateSchema = z.object({
  certificateNumber: z.string().min(1, "Nomor sertifikat wajib diisi").max(100),
  certificateName: z.string().min(1, "Nama sertifikat wajib diisi").max(200),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  departmentId: z.string().optional(),
  issuingBody: z.string().optional(),
  issueDate: z.string().min(1, "Tanggal terbit wajib diisi"),
  validFrom: z.string().optional(),
  expiryDate: z.string().min(1, "Tanggal berakhir wajib diisi"),
  storageLocation: z.string().optional(),
  pic: z.string().min(1, "PIC wajib diisi"),
  picEmail: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  ccEmail: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  fileUrl: z.string().min(1, "Dokumen sertifikat wajib diunggah"),
  driveFileId: z.string().min(1),
  fileMimeType: z.string().min(1),
});
export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;

// --- Monitoring: Contract Value ---

export const contractValueSchema = z.object({
  contractValue: z.coerce.number().min(0, "Nilai kontrak tidak boleh negatif"),
});
export type ContractValueInput = z.infer<typeof contractValueSchema>;

// --- Phase 8: Surveillance ---

export const surveillanceSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "POSTPONED"]),
  scheduledDate: z.string().min(1, "Tanggal jadwal wajib diisi"),
  picName: z.string().max(120, "Maksimal 120 karakter").optional(),
  notes: z.string().max(1000, "Maksimal 1000 karakter").optional(),
  result: z.string().max(1000, "Maksimal 1000 karakter").optional(),
});
export type SurveillanceInput = z.infer<typeof surveillanceSchema>;

// --- Personnel Certification Reminder ---

export const employeeSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(120, "Maksimal 120 karakter"),
  employeeId: z.string().max(50, "Maksimal 50 karakter").optional(),
  position: z.string().max(120, "Maksimal 120 karakter").optional(),
  departmentId: z.string().optional(),
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  isActive: z.boolean(),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

export const personnelCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(120, "Maksimal 120 karakter"),
});
export type PersonnelCategoryInput = z.infer<typeof personnelCategorySchema>;

export const personnelCertificationSchema = z.object({
  employeeId: z.string().min(1, "Personil wajib dipilih"),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  certificationName: z.string().min(1, "Nama sertifikasi wajib diisi").max(200, "Maksimal 200 karakter"),
  certificationNumber: z.string().max(100, "Maksimal 100 karakter").optional(),
  issuingBody: z.string().max(200, "Maksimal 200 karakter").optional(),
  issueDate: z.string().optional(),
  validFrom: z.string().optional(),
  expiryDate: z.string().min(1, "Tanggal berakhir wajib diisi"),
  ccEmail: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  notes: z.string().optional(),
  fileUrl: z.string().nullable().optional(),
  driveFileId: z.string().nullable().optional(),
  fileMimeType: z.string().nullable().optional(),
});
export type PersonnelCertificationInput = z.infer<typeof personnelCertificationSchema>;

// --- Client Portal: self-service password management ---

export const portalChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
  newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
});
export type PortalChangePasswordInput = z.infer<typeof portalChangePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token wajib ada"),
  newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
