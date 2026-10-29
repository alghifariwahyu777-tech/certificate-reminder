import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { NotificationList } from "@/components/notification/NotificationList";
import { PageBody } from "@/components/layout/PageBody";

export default async function NotificationsPage() {
  const session = await getSession();

  return (
    <>
      <Navbar
        title="Notifikasi"
        subtitle="Data yang mendekati atau melewati tanggal berakhir"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <PageBody>
        <NotificationList />
      </PageBody>
    </>
  );
}
