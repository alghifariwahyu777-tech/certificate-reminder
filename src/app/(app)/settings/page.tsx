import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { ProjectMonitoringSettingsForm } from "@/components/settings/ProjectMonitoringSettingsForm";
import { getMonitoringThresholds } from "@/lib/project-monitoring";
import { WeeklyReportSettingsForm } from "@/components/settings/WeeklyReportSettingsForm";
import { PageBody } from "@/components/layout/PageBody";

export default async function SettingsPage() {
  const session = await getSession();
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const thresholds = await getMonitoringThresholds();

  return (
    <>
      <Navbar
        title="Pengaturan"
        subtitle="Pengaturan umum sistem"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <PageBody width="form">
        <SettingsForm
          canManage={session?.role === "ADMIN"}
          initialWhatsappNumber={settings?.adminWhatsappNumber || ""}
        />
        <ProjectMonitoringSettingsForm canManage={session?.role === "ADMIN"} initial={thresholds} />
        <WeeklyReportSettingsForm
          canManage={session?.role === "ADMIN"}
          initial={{
            weeklyReportEnabled: settings?.weeklyReportEnabled ?? false,
            weeklyReportRecipients: (settings?.weeklyReportRecipients || "").split(", ").filter(Boolean).join("\n"),
            weeklyReportDay: settings?.weeklyReportDay ?? 1,
            picUpdateRequestEnabled: settings?.picUpdateRequestEnabled ?? true,
            picUpdateRequestDay: settings?.picUpdateRequestDay ?? 1,
          }}
        />
      </PageBody>
    </>
  );
}
