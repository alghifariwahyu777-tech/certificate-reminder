import { itemHandlers } from "@/lib/project-subresource";
import { issueDef } from "@/lib/project-subresource-defs";

const handlers = itemHandlers(issueDef);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
