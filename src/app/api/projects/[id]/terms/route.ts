import { collectionHandlers } from "@/lib/project-subresource";
import { termDef } from "@/lib/project-subresource-defs";

const handlers = collectionHandlers(termDef);
export const POST = handlers.POST;
