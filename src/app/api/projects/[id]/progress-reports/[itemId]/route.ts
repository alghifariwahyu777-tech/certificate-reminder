import { itemHandlers } from "@/lib/project-subresource";
import { progressReportDef } from "@/lib/project-subresource-defs";

const handlers = itemHandlers(progressReportDef);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
