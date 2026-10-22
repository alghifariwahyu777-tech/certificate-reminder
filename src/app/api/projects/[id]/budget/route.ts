import { collectionHandlers } from "@/lib/project-subresource";
import { budgetItemDef } from "@/lib/project-subresource-defs";

const handlers = collectionHandlers(budgetItemDef);
export const POST = handlers.POST;
