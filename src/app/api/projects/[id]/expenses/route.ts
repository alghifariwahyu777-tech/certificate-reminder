import { collectionHandlers } from "@/lib/project-subresource";
import { expenseDef } from "@/lib/project-subresource-defs";

const handlers = collectionHandlers(expenseDef);
export const POST = handlers.POST;
