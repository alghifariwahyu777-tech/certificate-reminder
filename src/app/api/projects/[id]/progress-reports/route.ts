import { collectionHandlers } from "@/lib/project-subresource";
import { progressReportDef } from "@/lib/project-subresource-defs";

const handlers = collectionHandlers(progressReportDef);
export const POST = handlers.POST;
