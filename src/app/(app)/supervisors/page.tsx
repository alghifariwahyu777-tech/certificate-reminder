import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { SupervisorManager } from "@/components/SupervisorManager";

export default async function SupervisorsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supervisors = await prisma.supervisor.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <>
      <Navbar
        title="Supervisors"
        subtitle="Direktori atasan terpusat untuk CC reminder di seluruh fitur"
        adminName={session.name}
        role={session.role}
      />
      <div className="p-5 md:p-8">
        <SupervisorManager
          canManage={session.role === "ADMIN"}
          initialSupervisors={supervisors.map((s) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            position: s.position,
            isActive: s.isActive,
          }))}
        />
      </div>
    </>
  );
}
