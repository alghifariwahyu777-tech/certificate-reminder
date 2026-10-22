import { collectionHandlers } from "@/lib/project-subresource";
import { milestoneDef } from "@/lib/project-subresource-defs";

const handlers = collectionHandlers(milestoneDef);
export const POST = handlers.POST;
