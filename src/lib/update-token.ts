import { SignJWT, jwtVerify } from "jose";

/**
 * Signed links that let a project PIC send a progress update straight from
 * the weekly email, without logging in. The token carries only the project
 * id and a purpose, is signed with SESSION_SECRET (so it can't be forged or
 * pointed at another project) and expires after TOKEN_DAYS. It grants
 * exactly one capability: submitting a progress update for that project.
 */
const TOKEN_DAYS = 21;
const PURPOSE = "project-progress-update";

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set in the environment");
  return new TextEncoder().encode(secret);
}

export async function createUpdateToken(projectId: string, picEmail: string | null): Promise<string> {
  return new SignJWT({ pid: projectId, purpose: PURPOSE, em: picEmail || "" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_DAYS}d`)
    .sign(key());
}

/** Returns the project id the token grants access to, or null when invalid/expired. */
export async function verifyUpdateToken(token: string): Promise<{ projectId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.purpose !== PURPOSE || typeof payload.pid !== "string") return null;
    return { projectId: payload.pid, email: typeof payload.em === "string" ? payload.em : "" };
  } catch {
    return null;
  }
}

export function updateLink(token: string): string {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${appUrl}/update/${token}`;
}
