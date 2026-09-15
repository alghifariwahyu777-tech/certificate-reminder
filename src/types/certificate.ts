export type CategoryLite = {
  id: string;
  name: string;
};

export type ClientLite = {
  id: string;
  name: string;
};

export type DepartmentLite = {
  id: string;
  name: string;
};

export type Renewal = {
  id: string;
  certificateId: string;
  renewalDate: string;
  previousNumber: string;
  previousExpiryDate: string;
  newCertificateNumber: string;
  newValidFrom: string | null;
  newExpiryDate: string;
  notes: string | null;
  fileUrl: string | null;
  driveFileId: string | null;
  fileMimeType: string | null;
  createdAt: string;
};

export type CertificateWithCategory = {
  id: string;
  certificateNumber: string;
  certificateName: string;
  issuingBody: string | null;
  issueDate: string;
  validFrom: string | null;
  expiryDate: string;
  storageLocation: string | null;
  pic: string;
  picEmail: string | null;
  ccEmail: string | null;
  description: string | null;
  notes: string | null;
  fileUrl: string | null;
  driveFileId: string | null;
  fileMimeType: string | null;
  categoryId: string;
  category: CategoryLite;
  clientId: string;
  client: ClientLite;
  departmentId: string | null;
  department: DepartmentLite | null;
  createdAt: string;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
