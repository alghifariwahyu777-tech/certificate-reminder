import type { HseRecord, HseSummary } from "@/lib/project-hse";
import type { RabData, RabRevisionSummary } from "@/lib/project-rab-import";
import type { MonitoringInput, MonitoringSummary, MonitoringThresholds, PadBucket } from "@/lib/project-monitoring-shared";
import type { CertWarning } from "@/lib/personnel-mapping";
import type { CostCurveRow, MarginTimelineRow, MarginAnalysis, ProfitLoss } from "@/lib/project-margin";

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
  cause: string;
  referenceNo: string | null;
  createdBy: string | null;
  fileUrl: string | null;
  driveFileId: string | null;
  fileMimeType: string | null;
};

export type HseRecordDTO = Omit<HseRecord, "periodDate"> & { id: string; periodDate: string; notes: string | null; createdBy: string | null };

export type IssueDTO = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  impact: string;
  likelihood: string;
  category: string | null;
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
  hse: { records: HseRecordDTO[]; summary: HseSummary };
  // batch 2
  trend: number | null;
  padSchedule: PadBucket[];
  snapshots: { weekKey: string; actualPercent: number; plannedPercent: number; deviation: number }[];
  closeout: CloseoutDTO | null;
  team: TeamMemberDTO[];
  employees: { id: string; name: string; nip: string | null; position: string | null }[];
  // margin / triple constraint
  margin: MarginAnalysis;
  costCurve: CostCurveRow[];
  marginTimeline: MarginTimelineRow[];
  categorySuggestions: string[];
  baseline: { lockedAt: string; lockedBy: string | null; contractValue: number | null; budget: number | null; endDate: string | null } | null;
  marginHistory: { weekKey: string; actualMarginPct: number | null; forecastMarginPct: number | null; plannedMarginPct: number | null }[];
  /** RAB Sucofindo: every uploaded version (newest first) and the full content of the current one */
  rab: { revisions: RabRevisionSummary[]; latest: RabData | null };
  targetMarginPct: number | null;
  pnl: ProfitLoss;
};

export type CloseoutDTO = {
  bappDate: string | null;
  bastDate: string | null;
  finalReportDate: string | null;
  satisfaction: number | null;
  lessonsLearned: string | null;
  notes: string | null;
  fileUrl: string | null;
  driveFileId: string | null;
  fileMimeType: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

export type TeamMemberDTO = {
  id: string;
  employeeId: string;
  name: string;
  nip: string | null;
  position: string | null;
  role: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  /** number of running projects this person is assigned to (SDB load) */
  activeProjects: number;
  warnings: CertWarning[];
};
