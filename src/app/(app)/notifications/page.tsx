import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { NotificationList } from "@/components/notification/NotificationList";

export default async function NotificationsPage() {
  const session = await getSession();

  return (
    <>
      <Navbar
        title="Notifications"
        subtitle="Sertifikat yang mendekati atau telah melewati masa berlaku"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8 max-w-3xl">
        <NotificationList />
      </div>
    </>
  );
}
