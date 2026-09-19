import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPersonnelEmailTemplate } from "@/lib/email-template-db";
import { DEFAULT_PERSONNEL_SIMPLE_FIELDS, DEFAULT_PERSONNEL_BODY_HTML } from "@/lib/personnel-email-template";
import { Navbar } from "@/components/layout/Navbar";
import { PersonnelEmailTemplateEditor } from "@/components/PersonnelEmailTemplateEditor";

export default async function PersonnelEmailTemplatePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const template = await getPersonnelEmailTemplate();

  return (
    <>
      <Navbar
        title="Personnel Email Template"
        subtitle="Sesuaikan isi email reminder untuk sertifikasi personil"
        adminName={session.name}
        role={session.role}
      />
      <div className="p-5 md:p-8">
        <PersonnelEmailTemplateEditor
          initialMode={template.mode === "ADVANCED" ? "ADVANCED" : "SIMPLE"}
          initialSubject={template.subject}
          initialSimpleFields={{
            companyName: template.companyName || DEFAULT_PERSONNEL_SIMPLE_FIELDS.companyName,
            systemName: template.systemName || DEFAULT_PERSONNEL_SIMPLE_FIELDS.systemName,
            greeting: template.greeting || DEFAULT_PERSONNEL_SIMPLE_FIELDS.greeting,
            introText: template.introText || DEFAULT_PERSONNEL_SIMPLE_FIELDS.introText,
            closingText: template.closingText || DEFAULT_PERSONNEL_SIMPLE_FIELDS.closingText,
            footerText: template.footerText || DEFAULT_PERSONNEL_SIMPLE_FIELDS.footerText,
          }}
          initialBodyHtml={template.bodyHtml || DEFAULT_PERSONNEL_BODY_HTML}
        />
      </div>
    </>
  );
}
