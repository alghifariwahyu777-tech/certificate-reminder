import { collectionHandlers } from "@/lib/project-subresource";
import { hseReportDef } from "@/lib/project-subresource-defs";

const handlers = collectionHandlers(hseReportDef);
export const POST = handlers.POST;
