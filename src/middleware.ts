import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { checkRequiredEnv } from "@/lib/env";

const SESSION_COOKIE = "cert_reminder_session";
const PORTAL_SESSION_COOKIE = "cert_reminder_portal_session";
const PUBLIC_PATHS = ["/login"];

// Pages that a Viewer is not allowed to open (create/manage-only screens).
// Prefix-matched, so "/certificate/edit" also covers "/certificate/edit/abc123".
const ADMIN_ONLY_PATH_PREFIXES = [
  "/certificate/add",
  "/certificate/edit",
  "/certificate/import",
  "/trash",
  "/users",
  "/audit-log",
  "/email-template",
];

function getSecretKey() {
  const secret = process.env.SESSION_SECRET || "";
  return new TextEncoder().encode(secret);
}

async function handlePortalRoute(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/portal/login" || pathname.startsWith("/api/portal/auth/login");

  const token = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecretKey());
      isAuthenticated = !!payload.portal;
    } catch {
      isAuthenticated = false;
    }
  }

  if (!isAuthenticated && !isPublic) {
    const loginUrl = new URL("/portal/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && pathname === "/portal/login") {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return NextResponse.next();
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fail loudly and clearly if the .env file is missing required values —
  // this replaces a confusing downstream Prisma/jose stack trace with a
  // plain-language message on literally the first request.
  const envCheck = checkRequiredEnv();
  if (!envCheck.ok && !pathname.startsWith("/_next")) {
    return new NextResponse(
      `Konfigurasi belum lengkap.\n\n` +
        `Environment variable berikut belum diisi di file .env:\n` +
        envCheck.missing.map((name) => `  - ${name}`).join("\n") +
        `\n\nSalin .env.example menjadi .env, isi nilainya, lalu restart server (npm run dev).`,
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  // Client Portal has its own, entirely separate auth flow/cookie — handled
  // independently so it never shares session state with the internal side.
  if (pathname.startsWith("/portal") || pathname.startsWith("/api/portal")) {
    return handlePortalRoute(request);
  }

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads");

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let isAuthenticated = false;
  let role: string | undefined;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecretKey());
      isAuthenticated = true;
      role = payload.role as string | undefined;
    } catch {
      isAuthenticated = false;
    }
  }

  if (!isAuthenticated && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isAuthenticated && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    isAuthenticated &&
    role === "VIEWER" &&
    ADMIN_ONLY_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const redirectUrl = new URL("/dashboard", request.url);
    redirectUrl.searchParams.set("denied", "1");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/upload|api/files|api/reminders/run|_next/static|_next/image|brand|favicon.ico).*)"],
};
