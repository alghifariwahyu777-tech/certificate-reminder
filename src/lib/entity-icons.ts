import {
  Award,
  Bell,
  Building,
  Building2,
  CalendarDays,
  ClipboardList,
  FileBadge2,
  FileBarChart,
  FileType,
  FolderClock,
  Gauge,
  Layers,
  LayoutDashboard,
  Mail,
  Network,
  ScrollText,
  Settings,
  Tags,
  Trash2,
  TrendingUp,
  UserCircle,
  Users,
  Users2,
  UserSquare2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * One icon per kind of data, used everywhere that kind of data appears:
 * menu, page title, tabs, key figures and list rows. Change it here and it
 * changes across the whole system.
 */
export const ENTITY_ICON = {
  certificate: FileBadge2, // sertifikat klien
  personnelCert: Award, // sertifikasi personil
  employee: UserSquare2, // karyawan / personil
  project: FolderClock,
  equipment: Wrench, // alat dan kalibrasi
  client: Building2,
  department: Building, // divisi
  application: ClipboardList, // permohonan
  service: Layers, // layanan
  documentType: FileType,
  category: Tags,
  emailTemplate: Mail,
  user: Users,
  supervisor: Users2,
  notification: Bell,
  report: FileBarChart,
  weeklyReport: CalendarDays,
  assignment: Network, // penugasan personil
  auditLog: ScrollText,
  trash: Trash2,
  settings: Settings,
  profile: UserCircle,
  dashboard: LayoutDashboard,
  applicationMonitoring: Gauge,
  projectMonitoring: TrendingUp,
} satisfies Record<string, LucideIcon>;

/** Icon of each page, by its menu address. The page title shows the same icon as its menu item. */
export const PAGE_ICON: Record<string, LucideIcon> = {
  "/dashboard": ENTITY_ICON.dashboard,
  "/applications": ENTITY_ICON.application,
  "/departments": ENTITY_ICON.department,
  "/employees": ENTITY_ICON.employee,
  "/personnel-certifications": ENTITY_ICON.personnelCert,
  "/personnel-categories": ENTITY_ICON.category,
  "/personnel-email-template": ENTITY_ICON.emailTemplate,
  "/certificate": ENTITY_ICON.certificate,
  "/monitoring": ENTITY_ICON.applicationMonitoring,
  "/services": ENTITY_ICON.service,
  "/document-types": ENTITY_ICON.documentType,
  "/clients": ENTITY_ICON.client,
  "/category": ENTITY_ICON.category,
  "/email-template": ENTITY_ICON.emailTemplate,
  "/projects/dashboard": ENTITY_ICON.projectMonitoring,
  "/projects": ENTITY_ICON.project,
  "/projects/personnel": ENTITY_ICON.assignment,
  "/projects/weekly-report": ENTITY_ICON.weeklyReport,
  "/project-categories": ENTITY_ICON.category,
  "/project-email-template": ENTITY_ICON.emailTemplate,
  "/equipment": ENTITY_ICON.equipment,
  "/equipment-categories": ENTITY_ICON.category,
  "/equipment-email-template": ENTITY_ICON.emailTemplate,
  "/notifications": ENTITY_ICON.notification,
  "/reports": ENTITY_ICON.report,
  "/users": ENTITY_ICON.user,
  "/supervisors": ENTITY_ICON.supervisor,
  "/settings": ENTITY_ICON.settings,
  "/audit-log": ENTITY_ICON.auditLog,
  "/trash": ENTITY_ICON.trash,
  "/profile": ENTITY_ICON.profile,
};

/** Icon for any address: the longest menu address that the path starts with. */
export function pageIconFor(pathname: string): LucideIcon | null {
  // a single project's page belongs to Monitoring Project
  const m = pathname.match(/^\/projects\/([^/]+)/);
  if (m && !["new", "dashboard", "personnel", "weekly-report"].includes(m[1])) return pathname.endsWith("/edit") ? ENTITY_ICON.project : ENTITY_ICON.projectMonitoring;
  let best: string | null = null;
  for (const href of Object.keys(PAGE_ICON)) {
    if ((pathname === href || pathname.startsWith(href + "/")) && (!best || href.length > best.length)) best = href;
  }
  return best ? PAGE_ICON[best] : null;
}
