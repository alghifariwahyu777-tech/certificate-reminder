import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { PersonnelImportForm } from "@/components/personnel/PersonnelImportForm";

export default async function PersonnelImportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/personnel-certifications");

  return (
    <>
      <Navbar
        title="Import Sertifikasi Personil"
        subtitle="Tambahkan banyak data sertifikasi personil sekaligus lewat Excel"
        adminName={session.name}
        role={session.role}
      />
      <div className="p-5 md:p-8">
        <PersonnelImportForm />
      </div>
    </>
  );
}
