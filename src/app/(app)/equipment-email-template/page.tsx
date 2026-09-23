import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEquipmentEmailTemplate } from "@/lib/email-template-db";
import { DEFAULT_EQUIPMENT_SIMPLE_FIELDS, DEFAULT_EQUIPMENT_BODY_HTML } from "@/lib/equipment-email-template";
import { Navbar } from "@/components/layout/Navbar";
import { EquipmentEmailTemplateEditor } from "@/components/EquipmentEmailTemplateEditor";

export default async function EquipmentEmailTemplatePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const template = await getEquipmentEmailTemplate();

  return (
    <>
      <Navbar
        title="Equipment Email Template"
        subtitle="Sesuaikan isi email reminder untuk Equipment Calibration"
        adminName={session.name}
        role={session.role}
      />
      <div className="p-5 md:p-8">
        <EquipmentEmailTemplateEditor
          initialMode={template.mode === "ADVANCED" ? "ADVANCED" : "SIMPLE"}
          initialSubject={template.subject}
          initialSimpleFields={{
            companyName: template.companyName || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.companyName,
            systemName: template.systemName || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.systemName,
            greeting: template.greeting || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.greeting,
            introText: template.introText || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.introText,
            closingText: template.closingText || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.closingText,
            footerText: template.footerText || DEFAULT_EQUIPMENT_SIMPLE_FIELDS.footerText,
          }}
          initialBodyHtml={template.bodyHtml || DEFAULT_EQUIPMENT_BODY_HTML}
        />
      </div>
    </>
  );
}
