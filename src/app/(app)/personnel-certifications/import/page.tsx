import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { PersonnelImportForm } from "@/components/personnel/PersonnelImportForm";
import { PageBody } from "@/components/layout/PageBody";

export default async function PersonnelImportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/personnel-certifications");

  return (
    <>
      <Navbar
        title="Impor Sertifikasi Personil"
        subtitle="Tambahkan banyak sertifikasi sekaligus dari file Excel"
        adminName={session.name}
        role={session.role}
      />
      <PageBody width="form">
        <PersonnelImportForm />
      </PageBody>
    </>
  );
}
