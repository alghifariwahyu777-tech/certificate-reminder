import { itemHandlers } from "@/lib/project-subresource";
import { milestoneDef } from "@/lib/project-subresource-defs";

const handlers = itemHandlers(milestoneDef);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
