import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { supervisorSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const supervisors = await prisma.supervisor.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ supervisors });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = supervisorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  const existing = await prisma.supervisor.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ message: "Email atasan ini sudah terdaftar." }, { status: 409 });
  }

  const supervisor = await prisma.supervisor.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      position: parsed.data.position || null,
      isActive: parsed.data.isActive ?? true,
    },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "Supervisor",
    entityId: supervisor.id,
    description: `Menambahkan atasan "${supervisor.name}" (${supervisor.email}) ke direktori Supervisor.`,
  });

  return NextResponse.json({ supervisor }, { status: 201 });
}
