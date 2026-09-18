import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const session = await getSession();
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });

  return (
    <>
      <Navbar
        title="Settings"
        subtitle="Pengaturan umum aplikasi"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 max-w-xl">
        <SettingsForm
          canManage={session?.role === "ADMIN"}
          initialWhatsappNumber={settings?.adminWhatsappNumber || ""}
        />
      </div>
    </>
  );
}
