import { prisma } from "@/lib/prisma";
import { verifyUpdateToken } from "@/lib/update-token";

/**
 * Resolves an emailed update link to its project. Rejected when the token is
 * invalid/expired, the project is gone or no longer running, or the project's
 * PIC email has changed since the link was sent (so a former PIC's old link
 * stops working).
 */
export async function resolveUpdateToken(token: string) {
  const t = await verifyUpdateToken(token);
  if (!t) return { error: "Link sudah kedaluwarsa atau tidak valid. Mohon gunakan link dari email terbaru." } as const;
  const project = await prisma.project.findFirst({
    where: { id: t.projectId, deletedAt: null },
    select: { id: true, pic: true, picEmail: true, status: true },
  });
  if (!project) return { error: "Project tidak ditemukan." } as const;
  if (t.email && (project.picEmail || "").trim().toLowerCase() !== t.email.trim().toLowerCase()) {
    return { error: "PIC project ini sudah berganti, link ini tidak berlaku lagi." } as const;
  }
  if (project.status !== "ONGOING") return { error: "Project ini sudah tidak berjalan, update progres ditutup." } as const;
  return { project } as const;
}
