import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncNotifications } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await syncNotifications();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const notifications = await prisma.notification.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { certificate: { select: { id: true, certificateName: true, certificateNumber: true } } },
  });

  const newCount = await prisma.notification.count({ where: { status: "NEW" } });

  return NextResponse.json({ notifications, newCount });
}
