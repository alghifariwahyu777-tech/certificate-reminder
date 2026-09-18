import { NextRequest, NextResponse } from "next/server";
import { destroyClientSession, getClientSession } from "@/lib/client-auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await getClientSession();
  if (session) {
    await logAudit({
      userName: session.name,
      action: "LOGOUT",
      entityType: "Auth",
      description: `${session.name} logout dari Client Portal.`,
    });
  }
  await destroyClientSession();
  return NextResponse.redirect(new URL("/portal/login", request.url), { status: 303 });
}
