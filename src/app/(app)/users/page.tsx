import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { UserManager } from "@/components/user/UserManager";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  return (
    <>
      <Navbar title="Users" subtitle="Kelola pengguna & hak akses" adminName={session.name} role={session.role} />
      <div className="p-5 md:p-8 max-w-3xl">
        <UserManager
          currentUserId={session.userId}
          initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
        />
      </div>
    </>
  );
}
