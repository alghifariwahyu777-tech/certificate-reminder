import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { TrashViewer } from "@/components/TrashViewer";

export default async function TrashPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <Navbar
        title="Trash"
        subtitle="Sertifikat, sertifikasi personil, project, & alat yang telah dihapus — bisa dipulihkan atau dihapus permanen"
        adminName={session.name}
        role={session.role}
      />
      <div className="p-5 md:p-8">
        <TrashViewer />
      </div>
    </>
  );
}
