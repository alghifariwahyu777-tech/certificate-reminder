import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const CLIENT_SESSION_COOKIE = "cert_reminder_portal_session";
const CLIENT_SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set in the environment");
  }
  // Deliberately reuses the same app-wide secret as internal auth — the two
  // session types stay isolated via separate cookie names and payload
  // shapes, not via separate keys.
  return new TextEncoder().encode(secret);
}

export type ClientSessionPayload = {
  clientUserId: string;
  clientId: string;
  email: string;
  name: string;
};

export async function createClientSession(payload: ClientSessionPayload) {
  const token = await new SignJWT({ ...payload, portal: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CLIENT_SESSION_DURATION}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(CLIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CLIENT_SESSION_DURATION,
    path: "/",
  });
}

export async function getClientSession(): Promise<ClientSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.portal) return null; // reject a stray internal-session token, just in case
    return payload as unknown as ClientSessionPayload;
  } catch {
    return null;
  }
}

export async function destroyClientSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_SESSION_COOKIE);
}

export const CLIENT_SESSION_COOKIE_NAME = CLIENT_SESSION_COOKIE;
