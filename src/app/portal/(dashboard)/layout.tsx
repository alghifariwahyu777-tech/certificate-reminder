import { redirect } from "next/navigation";
import { getClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { PortalNavbar } from "@/components/portal/PortalNavbar";

export default async function PortalDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getClientSession();
  if (!session) redirect("/portal/login");

  const client = await prisma.client.findUnique({ where: { id: session.clientId } });
  if (!client) redirect("/portal/login");

  return (
    <div className="min-h-screen bg-paper dark:bg-slate-950">
      <PortalNavbar clientName={client.name} userName={session.name} />
      <div className="flex-1">{children}</div>
      <footer className="px-5 md:px-8 py-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
        PT Sucofindo (Persero) · Client Portal
      </footer>
    </div>
  );
}
