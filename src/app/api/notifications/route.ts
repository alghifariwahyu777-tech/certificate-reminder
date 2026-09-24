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
    where: { audience: "INTERNAL", ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      certificate: { select: { id: true, certificateName: true, certificateNumber: true } },
      personnelCertification: {
        select: { id: true, certificationName: true, certificationNumber: true },
      },
      project: { select: { id: true, projectName: true, projectNumber: true } },
      equipment: { select: { id: true, name: true, assetNumber: true } },
      application: { select: { id: true, applicationNumber: true } },
    },
  });

  const newCount = await prisma.notification.count({ where: { audience: "INTERNAL", status: "NEW" } });

  return NextResponse.json({ notifications, newCount });
}
