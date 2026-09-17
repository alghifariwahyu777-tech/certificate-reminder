import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";

export async function POST() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { status: "NEW", audience: "CLIENT", application: { clientId: session.clientId } },
    data: { status: "READ" },
  });

  return NextResponse.json({ success: true });
}
