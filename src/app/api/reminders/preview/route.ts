import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { substitutePlaceholders, buildSimpleTemplateHtml, DEFAULT_SIMPLE_FIELDS } from "@/lib/email-template";
import { getEmailTemplate } from "@/lib/email-template-db";

const SAMPLE_DATA = {
  certificateName: "ISO 9001:2015 Quality Management System",
  certificateNumber: "ISO-9001-2023-001",
  categoryName: "ISO",
  clientName: "PT Nusantara Pangan Sejahtera",
  pic: "Budi Santoso",
  expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  daysRemaining: 14,
};

/**
 * GET /api/reminders/preview
 *
 * Renders the *currently saved* reminder email template with sample data as
 * raw HTML, so it can be opened directly in a browser tab to see exactly
 * what recipients receive — including any edits made on the Email Template
 * settings page, in whichever mode (Simple/Advanced) is currently active.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const template = await getEmailTemplate();
  const html =
    template.mode === "ADVANCED" && template.bodyHtml
      ? substitutePlaceholders(template.bodyHtml, SAMPLE_DATA)
      : buildSimpleTemplateHtml(
          {
            companyName: template.companyName || DEFAULT_SIMPLE_FIELDS.companyName,
            systemName: template.systemName || DEFAULT_SIMPLE_FIELDS.systemName,
            greeting: template.greeting || DEFAULT_SIMPLE_FIELDS.greeting,
            introText: template.introText || DEFAULT_SIMPLE_FIELDS.introText,
            closingText: template.closingText || DEFAULT_SIMPLE_FIELDS.closingText,
            buttonText: template.buttonText || DEFAULT_SIMPLE_FIELDS.buttonText,
            footerText: template.footerText || DEFAULT_SIMPLE_FIELDS.footerText,
          },
          SAMPLE_DATA
        );

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
