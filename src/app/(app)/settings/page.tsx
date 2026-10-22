import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { ProjectMonitoringSettingsForm } from "@/components/settings/ProjectMonitoringSettingsForm";
import { getMonitoringThresholds } from "@/lib/project-monitoring";

export default async function SettingsPage() {
  const session = await getSession();
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const thresholds = await getMonitoringThresholds();

  return (
    <>
      <Navbar
        title="Settings"
        subtitle="Pengaturan umum aplikasi"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 max-w-2xl space-y-6">
        <SettingsForm
          canManage={session?.role === "ADMIN"}
          initialWhatsappNumber={settings?.adminWhatsappNumber || ""}
        />
        <ProjectMonitoringSettingsForm canManage={session?.role === "ADMIN"} initial={thresholds} />
      </div>
    </>
  );
}
