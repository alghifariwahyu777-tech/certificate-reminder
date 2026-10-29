/**
 * Shared layout for the filter row above every list: search first, then
 * filters at a fixed width (wrapping when space runs out), actions on the right.
 */
export const toolbarClass = "flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between";
export const filterGroupClass =
  "grid flex-1 grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:[&>*]:w-40 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:w-52";
export const toolbarActionsClass = "flex w-full flex-wrap gap-2 xl:w-auto xl:shrink-0 xl:flex-nowrap [&>*]:flex-1 sm:[&>*]:flex-none";
