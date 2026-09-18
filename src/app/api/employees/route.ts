import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { employeeSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const employees = await prisma.employee.findMany({
    orderBy: { name: "asc" },
    include: { department: true, _count: { select: { certifications: true } } },
  });

  return NextResponse.json({ employees });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message || "Data tidak valid." },
      { status: 400 }
    );
  }

  if (parsed.data.employeeId) {
    const duplicate = await prisma.employee.findUnique({ where: { employeeId: parsed.data.employeeId } });
    if (duplicate) {
      return NextResponse.json({ message: "NIP/ID Pegawai ini sudah digunakan." }, { status: 409 });
    }
  }

  const employee = await prisma.employee.create({
    data: {
      name: parsed.data.name,
      employeeId: parsed.data.employeeId || null,
      position: parsed.data.position || null,
      departmentId: parsed.data.departmentId || null,
      email: parsed.data.email,
      isActive: parsed.data.isActive,
    },
    include: { department: true },
  });

  await logAudit({
    userId: auth.session.userId,
    userName: auth.session.name,
    action: "CREATE",
    entityType: "Employee",
    entityId: employee.id,
    description: `Menambahkan personil "${employee.name}".`,
  });

  return NextResponse.json({ employee }, { status: 201 });
}
