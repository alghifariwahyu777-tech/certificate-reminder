import { prisma } from "@/lib/prisma";
import { MessageCircle } from "lucide-react";

/** Floating "Contact Admin" button, bottom-left — only renders when the admin has configured a number. */
export async function PortalWhatsAppButton() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const number = settings?.adminWhatsappNumber;
  if (!number) return null;

  const message = encodeURIComponent(
    "Halo, saya ingin bertanya terkait sertifikasi/permohonan saya di Certificate Reminder System PT Sucofindo (Persero)."
  );

  return (
    <a
      href={`https://wa.me/${number}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] text-white pl-3 pr-4 py-3 shadow-lg hover:brightness-95 transition"
      aria-label="Hubungi Admin via WhatsApp"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="text-sm font-medium hidden sm:inline">Hubungi Admin</span>
    </a>
  );
}
