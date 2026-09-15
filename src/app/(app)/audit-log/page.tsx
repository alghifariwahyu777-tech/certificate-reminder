import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";

export default async function AuditLogPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <Navbar title="Audit Log" subtitle="Riwayat seluruh aktivitas dalam sistem" adminName={session.name} role={session.role} />
      <div className="p-5 md:p-8">
        <AuditLogViewer />
      </div>
    </>
  );
}
