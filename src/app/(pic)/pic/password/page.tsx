import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default function PicPasswordPage() {
  return (
    <div className="space-y-5">
      <Link href="/pic" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Project Anda
      </Link>
      <ChangePasswordForm />
    </div>
  );
}
