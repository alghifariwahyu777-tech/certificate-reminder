import type { Metadata } from "next";
import { LinkIcon } from "lucide-react";
import { PicShell } from "@/components/pic/PicShell";
import { ProgressUpdateForm } from "@/components/pic/ProgressUpdateForm";
import { getUpdateFormContext } from "@/lib/pic-update";
import { resolveUpdateToken } from "@/lib/update-token-guard";

export const metadata: Metadata = { title: "Update Progres | Reminder System", robots: { index: false } };

/** No-login progress update opened from the weekly PIC email. */
export default async function UpdateByLinkPage(context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const r = await resolveUpdateToken(token);
  const ctx = "error" in r ? null : await getUpdateFormContext(r.project.id);

  return (
    <PicShell>
      {!ctx ? (
        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-10 text-center">
          <LinkIcon className="h-8 w-8 mx-auto text-slate-400" />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{"error" in r ? r.error : "Project tidak ditemukan."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Halo {ctx.pic}, silakan isi update progres project berikut.</p>
          <ProgressUpdateForm
            ctx={ctx}
            submitUrl={`/api/update/${encodeURIComponent(token)}`}
            uploadUrl={`/api/update/${encodeURIComponent(token)}/upload`}
          />
        </div>
      )}
    </PicShell>
  );
}
