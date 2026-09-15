import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { formatDate } from "@/lib/utils";
import { UserCircle, Mail, CalendarDays } from "lucide-react";

export default async function ProfilePage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;

  return (
    <>
      <Navbar title="Profile" subtitle="Informasi akun Anda" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <div className="p-5 md:p-8 max-w-xl space-y-5">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-ink text-white flex items-center justify-center font-mono font-semibold text-lg">
              {user?.name
                ?.split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "AD"}
            </div>
            <div>
              <CardTitle className="text-lg">{user?.name || "Admin"}</CardTitle>
              <p className="stamp-badge text-ink bg-ink/5 border-ink/10 mt-1.5">
                {user?.role === "ADMIN" ? "Administrator" : "Viewer"}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
                <p className="text-ink font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <UserCircle className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
                <p className="text-ink font-medium">{user?.role === "ADMIN" ? "Administrator" : "Viewer"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Bergabung Sejak</p>
                <p className="text-ink font-medium">{user ? formatDate(user.createdAt) : "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ubah Password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
