import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { TrashViewer } from "@/components/TrashViewer";
import { PageBody } from "@/components/layout/PageBody";

export default async function TrashPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <Navbar
        title="Sampah"
        subtitle="Data terhapus yang masih dapat dipulihkan"
        adminName={session.name}
        role={session.role}
      />
      <PageBody>
        <TrashViewer />
      </PageBody>
    </>
  );
}
