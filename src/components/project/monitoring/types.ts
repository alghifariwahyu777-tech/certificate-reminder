import type { MonitoringInput, MonitoringSummary, MonitoringThresholds } from "@/lib/project-monitoring-shared";

/** Dates are "YYYY-MM-DD" strings (date-only), amounts are plain numbers. */
export type MilestoneDTO = {
  id: string;
  sequence: number;
  name: string;
  description: string | null;
  weight: number;
  plannedDate: string | null;
  actualDate: string | null;
  status: string;
  notes: string | null;
  fileUrl: string | null;
  driveFileId: string | null;
  fileMimeType: string | null;
};

export type PlanRowDTO = { periodDate: string; plannedPercent: number };

export type ProgressReportDTO = {
  id: string;
  reportDate: string;
  actualPercent: number;
  summary: string | null;
  nextPlan: string | null;
  createdBy: string | null;
  fileUrl: string | null;
  driveFileId: string | null;
  fileMimeType: string | null;
};

export type TermDTO = {
  id: string;
  sequence: number;
  name: string;
  percent: number | null;
  amount: number;
  requirement: string | null;
  plannedDate: string | null;
  status: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  paidDate: string | null;
  paidAmount: number | null;
  notes: string | null;
  fileUrl: string | null;
  driveFileId: string | null;
  fileMimeType: string | null;
};

export type BudgetItemDTO = { id: string; category: string; description: string | null; amount: number };

export type ExpenseDTO = {
  id: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  createdBy: string | null;
  fileUrl: string | null;
  driveFileId: string | null;
  fileMimeType: string | null;
};

export type IssueDTO = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  impact: string;
  owner: string | null;
  targetDate: string | null;
  status: string;
  resolution: string | null;
  closedAt: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type ProjectMonitoringDTO = {
  projectId: string;
  status: string;
  contractValue: number | null;
  startDate: string | null;
  targetEndDate: string;
  canManage: boolean;
  today: number;
  input: MonitoringInput;
  summary: MonitoringSummary;
  thresholds: MonitoringThresholds;
  milestones: MilestoneDTO[];
  plans: PlanRowDTO[];
  reports: ProgressReportDTO[];
  terms: TermDTO[];
  budgetItems: BudgetItemDTO[];
  expenses: ExpenseDTO[];
  issues: IssueDTO[];
};
