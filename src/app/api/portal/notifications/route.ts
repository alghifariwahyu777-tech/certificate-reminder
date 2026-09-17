import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-auth";

export async function GET(request: NextRequest) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const notifications = await prisma.notification.findMany({
    where: {
      audience: "CLIENT",
      application: { clientId: session.clientId },
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { application: { select: { id: true, applicationNumber: true } } },
  });

  const newCount = await prisma.notification.count({
    where: { audience: "CLIENT", application: { clientId: session.clientId }, status: "NEW" },
  });

  return NextResponse.json({ notifications, newCount });
}
