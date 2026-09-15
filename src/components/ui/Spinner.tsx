import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, label = "Memuat..." }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-10 text-slate-500", className)}>
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
