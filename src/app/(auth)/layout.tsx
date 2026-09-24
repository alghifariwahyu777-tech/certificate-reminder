import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reminder System | PT Sucofindo (Persero)",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
