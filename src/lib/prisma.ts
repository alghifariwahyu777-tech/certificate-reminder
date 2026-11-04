import { Prisma, PrismaClient } from "@prisma/client";

/**
 * One Prisma client per server process, with an automatic retry for brief
 * connection drops.
 *
 * The Supabase pooler occasionally drops or refuses a connection for a moment
 * (cold start, pool full, network blip). Without a retry, that one failed
 * read shows the person an error page and they have to reload. Reads are safe
 * to repeat, so a read that fails with a connection-type error is retried up to
 * twice after a short pause. Writes are never retried, so nothing can be saved
 * twice.
 */

const READ_OPS = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy"]);
const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const TRANSIENT_TEXT = /can't reach database|connection (?:terminated|closed|reset|refused)|timed out fetching a new connection|prepared statement .* (?:already exists|does not exist)|server has closed the connection|ECONNRESET|ETIMEDOUT|socket hang up/i;

export function isTransientDbError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && TRANSIENT_CODES.has(e.code)) return true;
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return TRANSIENT_TEXT.test(msg);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          if (!READ_OPS.has(operation)) return query(args);
          for (let attempt = 0; ; attempt++) {
            try {
              return await query(args);
            } catch (e) {
              if (attempt >= 2 || !isTransientDbError(e)) throw e;
              await wait(250 * (attempt + 1));
            }
          }
        },
      },
    },
  });
}

type Client = ReturnType<typeof createClient>;
const globalForPrisma = globalThis as unknown as { prisma: Client | undefined };

export const prisma: Client = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
