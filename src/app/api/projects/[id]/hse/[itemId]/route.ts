import { itemHandlers } from "@/lib/project-subresource";
import { hseReportDef } from "@/lib/project-subresource-defs";

const handlers = itemHandlers(hseReportDef);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
