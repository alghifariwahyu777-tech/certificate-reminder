import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { SupervisorManager } from "@/components/SupervisorManager";
import { PageBody } from "@/components/layout/PageBody";

export default async function SupervisorsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supervisors = await prisma.supervisor.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <>
      <Navbar
        title="Atasan (Supervisor)"
        subtitle="Atasan yang menerima salinan semua email pengingat"
        adminName={session.name}
        role={session.role}
      />
      <PageBody>
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
      </PageBody>
    </>
  );
}
