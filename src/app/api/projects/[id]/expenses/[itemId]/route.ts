import { itemHandlers } from "@/lib/project-subresource";
import { expenseDef } from "@/lib/project-subresource-defs";

const handlers = itemHandlers(expenseDef);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
