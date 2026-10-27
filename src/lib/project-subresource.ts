import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { SessionPayload } from "@/lib/auth";

/**
 * Shared plumbing for the Project Monitoring sub-resources (milestones,
 * progress reports, terms, budget items, expenses, issues). Each one is a
 * child row of Project with the same rules:
 *   - writes are Admin-only (reads happen through the server-rendered page)
 *   - the parent project must exist and not be soft-deleted
 *   - an item can only be changed through its own project's URL
 *   - every change is written to the audit log
 * Route files stay a few lines long and only describe their own fields.
 */

type Ctx = { params: Promise<{ id: string; itemId?: string }> };
type Project = { id: string; projectName: string; projectNumber: string };

export type SubresourceDef<S extends z.ZodTypeAny> = {
  /** Human label for messages/audit, e.g. "milestone", "termin". */
  label: string;
  schema: S;
  /** Map validated input to Prisma column values (without projectId). */
  toData: (input: z.infer<S>, ctx: { session: SessionPayload; isCreate: boolean }) => Record<string, unknown>;
  /** Short description of the item for the audit log. */
  describe: (input: z.infer<S>) => string;
  create: (data: Record<string, unknown>) => Promise<{ id: string }>;
  update: (id: string, data: Record<string, unknown>) => Promise<{ id: string }>;
  remove: (id: string) => Promise<unknown>;
  findOwner: (id: string) => Promise<{ projectId: string } | null>;
};

const isUniqueViolation = (err: unknown) => typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";

export const toDate = (v: string | null | undefined): Date | null => (v ? new Date(v) : null);
export const emptyToNull = (v: string | null | undefined): string | null => (v && v.trim() ? v.trim() : null);

async function guard(context: Ctx) {
  const params = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error } as const;
  const project = await prisma.project.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true, projectName: true, projectNumber: true },
  });
  if (!project) return { error: NextResponse.json({ message: "Project tidak ditemukan." }, { status: 404 }) } as const;
  return { session: auth.session, project, itemId: params.itemId } as const;
}

async function parse<S extends z.ZodTypeAny>(request: NextRequest, schema: S) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      error: NextResponse.json({ message: parsed.error.errors[0]?.message || "Data tidak valid." }, { status: 400 }),
    } as const;
  }
  return { data: parsed.data as z.infer<S> } as const;
}

function audit(session: SessionPayload, project: Project, action: "CREATE" | "UPDATE" | "DELETE", entityId: string, text: string) {
  return logAudit({
    userId: session.userId,
    userName: session.name,
    action,
    entityType: "ProjectMonitoring",
    entityId,
    description: `${text} — project "${project.projectName}" (${project.projectNumber}).`,
  });
}

export function collectionHandlers<S extends z.ZodTypeAny>(def: SubresourceDef<S>) {
  return {
    async POST(request: NextRequest, context: Ctx) {
      const g = await guard(context);
      if ("error" in g) return g.error;
      const p = await parse(request, def.schema);
      if ("error" in p) return p.error;
      let item: { id: string };
      try {
        item = await def.create({ projectId: g.project.id, ...def.toData(p.data, { session: g.session, isCreate: true }) });
      } catch (err) {
        if (isUniqueViolation(err)) return NextResponse.json({ message: `Data ${def.label} yang sama sudah ada.` }, { status: 409 });
        throw err;
      }
      await audit(g.session, g.project, "CREATE", item.id, `Menambahkan ${def.label} "${def.describe(p.data)}"`);
      return NextResponse.json({ item }, { status: 201 });
    },
  };
}

export function itemHandlers<S extends z.ZodTypeAny>(def: SubresourceDef<S>) {
  async function owned(g: { project: Project; itemId?: string }) {
    if (!g.itemId) return false;
    const owner = await def.findOwner(g.itemId);
    return owner?.projectId === g.project.id;
  }
  const notFound = () => NextResponse.json({ message: `Data ${def.label} tidak ditemukan.` }, { status: 404 });

  return {
    async PATCH(request: NextRequest, context: Ctx) {
      const g = await guard(context);
      if ("error" in g) return g.error;
      if (!(await owned(g))) return notFound();
      const p = await parse(request, def.schema);
      if ("error" in p) return p.error;
      let item: { id: string };
      try {
        item = await def.update(g.itemId as string, def.toData(p.data, { session: g.session, isCreate: false }));
      } catch (err) {
        if (isUniqueViolation(err)) return NextResponse.json({ message: `Data ${def.label} yang sama sudah ada.` }, { status: 409 });
        throw err;
      }
      await audit(g.session, g.project, "UPDATE", item.id, `Mengubah ${def.label} "${def.describe(p.data)}"`);
      return NextResponse.json({ item });
    },
    async DELETE(_request: NextRequest, context: Ctx) {
      const g = await guard(context);
      if ("error" in g) return g.error;
      if (!(await owned(g))) return notFound();
      await def.remove(g.itemId as string);
      await audit(g.session, g.project, "DELETE", g.itemId as string, `Menghapus ${def.label}`);
      return NextResponse.json({ ok: true });
    },
  };
}

export { guard as guardProjectWrite, audit as auditProjectMonitoring };
