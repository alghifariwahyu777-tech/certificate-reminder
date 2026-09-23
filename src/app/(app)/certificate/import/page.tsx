import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { ImportForm } from "@/components/certificate/ImportForm";

export default async function ImportCertificatePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <Navbar
        title="Import Certificate"
        subtitle="Tambahkan banyak sertifikat sekaligus dari file Excel"
        adminName={session.name}
        role={session.role}
      />
      <div className="p-5 md:p-8 max-w-2xl">
        <ImportForm />
      </div>
    </>
  );
}
