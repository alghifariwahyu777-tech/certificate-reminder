import { itemHandlers } from "@/lib/project-subresource";
import { budgetItemDef } from "@/lib/project-subresource-defs";

const handlers = itemHandlers(budgetItemDef);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
