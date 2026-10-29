"use client";

import { usePathname } from "next/navigation";
import { pageIconFor } from "@/lib/entity-icons";
import { IconBox } from "@/components/ui/IconBox";

/** The page's own icon next to its title: the same icon as its menu item. */
export function PageIcon() {
  const Icon = pageIconFor(usePathname() || "");
  if (!Icon) return null;
  return <IconBox icon={Icon} className="max-sm:hidden" />;
}
