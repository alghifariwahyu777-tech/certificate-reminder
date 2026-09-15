import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEmailTemplate } from "@/lib/email-template-db";
import { DEFAULT_SIMPLE_FIELDS, DEFAULT_BODY_HTML } from "@/lib/email-template";
import { Navbar } from "@/components/layout/Navbar";
import { EmailTemplateEditor } from "@/components/EmailTemplateEditor";

export default async function EmailTemplatePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const template = await getEmailTemplate();

  return (
    <>
      <Navbar
        title="Email Template"
        subtitle="Sesuaikan isi email reminder"
        adminName={session.name}
        role={session.role}
      />
      <div className="p-5 md:p-8">
        <EmailTemplateEditor
          initialMode={template.mode === "ADVANCED" ? "ADVANCED" : "SIMPLE"}
          initialSubject={template.subject}
          initialSimpleFields={{
            companyName: template.companyName || DEFAULT_SIMPLE_FIELDS.companyName,
            systemName: template.systemName || DEFAULT_SIMPLE_FIELDS.systemName,
            greeting: template.greeting || DEFAULT_SIMPLE_FIELDS.greeting,
            introText: template.introText || DEFAULT_SIMPLE_FIELDS.introText,
            closingText: template.closingText || DEFAULT_SIMPLE_FIELDS.closingText,
            buttonText: template.buttonText || DEFAULT_SIMPLE_FIELDS.buttonText,
            footerText: template.footerText || DEFAULT_SIMPLE_FIELDS.footerText,
          }}
          initialBodyHtml={template.bodyHtml || DEFAULT_BODY_HTML}
        />
      </div>
    </>
  );
}
