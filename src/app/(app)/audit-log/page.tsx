import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";
import { PageBody } from "@/components/layout/PageBody";
import { can } from "@/lib/permissions";

export default async function AuditLogPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "system")) redirect("/dashboard");

  return (
    <>
      <Navbar title="Log Audit" subtitle="Riwayat perubahan data oleh pengguna" adminName={session.name} role={session.role} />
      <PageBody>
        <AuditLogViewer />
      </PageBody>
    </>
  );
}
