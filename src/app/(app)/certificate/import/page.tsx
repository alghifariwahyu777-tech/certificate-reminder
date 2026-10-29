import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ImportForm } from "@/components/certificate/ImportForm";
import { PageBody } from "@/components/layout/PageBody";

export default async function ImportCertificatePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <Navbar
        title="Impor Sertifikat"
        subtitle="Tambahkan banyak sertifikat sekaligus dari file Excel"
        adminName={session.name}
        role={session.role}
      />
      <PageBody width="form">
        <ImportForm />
      </PageBody>
    </>
  );
}
