import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ClientManager } from "@/components/client/ClientManager";

export default async function ClientsPage() {
  const session = await getSession();
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { certificates: true } } },
  });

  return (
    <>
      <Navbar title="Clients" subtitle="Kelola data klien pengguna jasa" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <div className="p-5 md:p-8 max-w-4xl">
        <ClientManager
          canManage={session?.role === "ADMIN"}
          initialClients={clients.map((c) => ({
            id: c.id,
            name: c.name,
            contactPerson: c.contactPerson,
            email: c.email,
            phone: c.phone,
            address: c.address,
            certificateCount: c._count.certificates,
          }))}
        />
      </div>
    </>
  );
}
