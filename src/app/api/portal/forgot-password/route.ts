import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getTransporter } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

const TOKEN_VALID_MINUTES = 60;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const clientUser = await prisma.clientUser.findUnique({ where: { email: parsed.data.email } });

  // Always return the same generic message whether or not the email exists —
  // otherwise this endpoint could be used to check which emails are registered.
  const genericResponse = NextResponse.json({
    message: "Jika email terdaftar, tautan reset password telah dikirim.",
  });

  if (!clientUser || !clientUser.isActive) return genericResponse;

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + TOKEN_VALID_MINUTES * 60 * 1000);

  await prisma.clientUser.update({
    where: { id: clientUser.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  const transporter = getTransporter();
  if (transporter) {
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/portal/reset-password?token=${token}`;
    const fromName = process.env.EMAIL_FROM_NAME || "Certificate Reminder - PT Sucofindo (Persero)";

    await transporter
      .sendMail({
        from: `"${fromName}" <${process.env.GMAIL_USER}>`,
        to: clientUser.email,
        subject: "Reset Password - Client Portal PT Sucofindo (Persero)",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
            <div style="background: #0F172A; padding: 20px 24px; border-radius: 8px 8px 0 0; border-bottom: 3px solid #0EA89B;">
              <span style="color: #ffffff; font-size: 14px; font-weight: bold;">PT Sucofindo (Persero) — Client Portal</span>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
              <p>Halo ${clientUser.name},</p>
              <p>Kami menerima permintaan reset password untuk akun Client Portal Anda. Klik tombol di bawah untuk membuat password baru (tautan berlaku ${TOKEN_VALID_MINUTES} menit):</p>
              <p style="margin: 24px 0;">
                <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0EA89B;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:bold;">Reset Password</a>
              </p>
              <p style="font-size: 12px; color: #94a3b8;">Jika Anda tidak meminta ini, abaikan saja email ini — password Anda tidak akan berubah.</p>
            </div>
          </div>`,
      })
      .catch((err) => console.error("Failed to send reset password email:", err));
  }

  await logAudit({
    userName: clientUser.name,
    action: "UPDATE",
    entityType: "Auth",
    description: `Permintaan reset password untuk akun Client Portal ${clientUser.email}.`,
  });

  return genericResponse;
}
