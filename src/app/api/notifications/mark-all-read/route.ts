import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { status: "NEW" },
    data: { status: "READ" },
  });

  return NextResponse.json({ success: true });
}
