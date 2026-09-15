/**
 * In-memory login rate limiter, keyed by "ip:email". Good enough for a
 * single-instance deployment (the typical case for this internal app). If
 * this is ever deployed across multiple serverless instances, swap the Map
 * below for a shared store (e.g. Redis / Upstash) — the in-memory count
 * won't be consistent across instances otherwise.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type Entry = { count: number; firstAttemptAt: number };

const attempts = new Map<string, Entry>();

// Periodic cleanup so this Map doesn't grow forever on a long-running server.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (now - entry.firstAttemptAt > WINDOW_MS) attempts.delete(key);
  }
}, 10 * 60 * 1000).unref?.();

function keyFor(ip: string, email: string) {
  return `${ip}:${email.toLowerCase()}`;
}

/**
 * Call before verifying credentials. Returns whether the request is allowed
 * through, and if not, how many seconds until the caller can try again.
 */
export function checkLoginRateLimit(
  ip: string,
  email: string
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const key = keyFor(ip, email);
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((entry.firstAttemptAt + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

/** Call after a failed login attempt. */
export function recordFailedLogin(ip: string, email: string) {
  const key = keyFor(ip, email);
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
  } else {
    entry.count += 1;
  }
}

/** Call after a successful login so the counter doesn't linger. */
export function clearLoginAttempts(ip: string, email: string) {
  attempts.delete(keyFor(ip, email));
}
