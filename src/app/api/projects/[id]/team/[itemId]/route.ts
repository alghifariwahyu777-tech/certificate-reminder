import { itemHandlers } from "@/lib/project-subresource";
import { assignmentDef } from "@/lib/project-subresource-defs";

const handlers = itemHandlers(assignmentDef);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
