import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { picProgressUpdateSchema } from "@/lib/validations";
import { applyProgressUpdate, picOwnsProject } from "@/lib/pic-update";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({ where: { id, deletedAt: null }, select: { picEmail: true } });
  if (!project) return NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 });
  const allowed = session.role === "ADMIN" || (session.role === "PIC" && picOwnsProject(session.email, project));
  if (!allowed) return NextResponse.json({ message: "Anda bukan PIC project ini." }, { status: 403 });

  const parsed = picProgressUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message || "Data tidak valid." }, { status: 400 });
  }

  const result = await applyProgressUpdate(id, parsed.data, { name: session.name, userId: session.userId, via: "LOGIN" });
  if ("error" in result) return NextResponse.json({ message: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
