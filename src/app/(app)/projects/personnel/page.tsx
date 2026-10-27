import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { getPersonnelMapping } from "@/lib/personnel-mapping";
import { PersonnelMapping } from "@/components/project/monitoring/PersonnelMapping";

export default async function PersonnelMappingPage() {
  const session = await getSession();
  const rows = await getPersonnelMapping(true);
  return (
    <>
      <Navbar
        title="Mapping Personil"
        subtitle="Siapa bertugas di project mana — beban kerja SDB & sertifikasi yang perlu diperpanjang"
        adminName={session?.name || "Admin"}
        role={session?.role || "ADMIN"}
      />
      <div className="p-5 md:p-8">
        <PersonnelMapping rows={rows} />
      </div>
    </>
  );
}
