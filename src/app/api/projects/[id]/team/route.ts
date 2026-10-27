import { collectionHandlers } from "@/lib/project-subresource";
import { assignmentDef } from "@/lib/project-subresource-defs";

const handlers = collectionHandlers(assignmentDef);
export const POST = handlers.POST;
