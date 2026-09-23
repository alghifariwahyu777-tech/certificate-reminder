import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getProjectEmailTemplate } from "@/lib/email-template-db";
import { DEFAULT_PROJECT_SIMPLE_FIELDS, DEFAULT_PROJECT_BODY_HTML } from "@/lib/project-email-template";
import { Navbar } from "@/components/layout/Navbar";
import { ProjectEmailTemplateEditor } from "@/components/ProjectEmailTemplateEditor";

export default async function ProjectEmailTemplatePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const template = await getProjectEmailTemplate();

  return (
    <>
      <Navbar
        title="Project Email Template"
        subtitle="Sesuaikan isi email reminder untuk Project Monitoring"
        adminName={session.name}
        role={session.role}
      />
      <div className="p-5 md:p-8">
        <ProjectEmailTemplateEditor
          initialMode={template.mode === "ADVANCED" ? "ADVANCED" : "SIMPLE"}
          initialSubject={template.subject}
          initialSimpleFields={{
            companyName: template.companyName || DEFAULT_PROJECT_SIMPLE_FIELDS.companyName,
            systemName: template.systemName || DEFAULT_PROJECT_SIMPLE_FIELDS.systemName,
            greeting: template.greeting || DEFAULT_PROJECT_SIMPLE_FIELDS.greeting,
            introText: template.introText || DEFAULT_PROJECT_SIMPLE_FIELDS.introText,
            closingText: template.closingText || DEFAULT_PROJECT_SIMPLE_FIELDS.closingText,
            footerText: template.footerText || DEFAULT_PROJECT_SIMPLE_FIELDS.footerText,
          }}
          initialBodyHtml={template.bodyHtml || DEFAULT_PROJECT_BODY_HTML}
        />
      </div>
    </>
  );
}
