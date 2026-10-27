import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { PicShell } from "@/components/pic/PicShell";

export const metadata: Metadata = { title: "Update Progres | Reminder System" };

export default async function PicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/pic");
  if (session.role === "VIEWER") redirect("/dashboard");
  return <PicShell userName={session.name}>{children}</PicShell>;
}
