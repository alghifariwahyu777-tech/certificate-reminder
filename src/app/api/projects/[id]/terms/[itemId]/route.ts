import { itemHandlers } from "@/lib/project-subresource";
import { termDef } from "@/lib/project-subresource-defs";

const handlers = itemHandlers(termDef);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
