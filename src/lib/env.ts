/**
 * Central place to read required environment variables. Throws immediately
 * with a clear, actionable message instead of letting a missing var surface
 * later as a cryptic downstream error (e.g. deep inside jose/Prisma).
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Environment variable "${name}" is not set. Add it to your .env file (see .env.example) and restart the server.`
    );
  }
  return value;
}

/**
 * Runs a one-time check of the variables the app cannot function without.
 * Call this from middleware so the failure surfaces on the very first
 * request with a plain-language message, rather than a raw stack trace.
 */
export function checkRequiredEnv(): { ok: true } | { ok: false; missing: string[] } {
  const required = ["SESSION_SECRET", "DATABASE_URL"];
  const missing = required.filter((name) => !process.env[name] || process.env[name]!.trim() === "");
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}
