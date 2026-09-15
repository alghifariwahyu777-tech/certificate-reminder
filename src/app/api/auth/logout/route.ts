import { NextRequest, NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (session) {
    await logAudit({
      userId: session.userId,
      userName: session.name,
      action: "LOGOUT",
      entityType: "Auth",
      description: `${session.name} logout.`,
    });
  }
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url));
}
