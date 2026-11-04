"use client";

import { ErrorState } from "@/components/layout/ErrorState";

export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-paper dark:bg-slate-950">
      <ErrorState {...props} home="/" />
    </div>
  );
}
