import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "cert_reminder_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

export type Role = "ADMIN" | "VIEWER";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set in the environment");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: Role;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

/**
 * Server-side guard for API routes that mutate data (POST/PUT/DELETE).
 * Returns the session when the caller is an authenticated Admin, or a
 * ready-to-return NextResponse (401/403) otherwise — callers do:
 *
 *   const auth = await requireAdmin();
 *   if ("error" in auth) return auth.error;
 *   const { session } = auth;
 */
export async function requireAdmin(): Promise<
  { session: SessionPayload } | { error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  if (session.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { message: "Aksi ini hanya dapat dilakukan oleh Administrator." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

/**
 * Server-side guard for API routes that only require an authenticated user
 * (Admin or Viewer), e.g. read (GET) endpoints.
 */
export async function requireAuth(): Promise<
  { session: SessionPayload } | { error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}
