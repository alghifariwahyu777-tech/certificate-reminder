import { collectionHandlers } from "@/lib/project-subresource";
import { issueDef } from "@/lib/project-subresource-defs";

const handlers = collectionHandlers(issueDef);
export const POST = handlers.POST;
