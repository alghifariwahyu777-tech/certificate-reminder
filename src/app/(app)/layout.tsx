import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-paper dark:bg-slate-950">
      <Sidebar role={session.role} />
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="px-5 md:px-8 py-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
          PT Sucofindo (Persero) · Certificate Reminder System · Internal Use Only
        </footer>
      </div>
    </div>
  );
}
