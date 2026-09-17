import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["NEW", "READ", "DONE"]),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getClientSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Status tidak valid." }, { status: 400 });
  }

  const existing = await prisma.notification.findFirst({
    where: { id: params.id, audience: "CLIENT", application: { clientId: session.clientId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ message: "Notifikasi tidak ditemukan." }, { status: 404 });

  const notification = await prisma.notification.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ notification });
}
