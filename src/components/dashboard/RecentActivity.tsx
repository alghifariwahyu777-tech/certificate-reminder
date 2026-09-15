import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { ScrollText, ArrowRight } from "lucide-react";

type ActivityItem = {
  id: string;
  userName: string;
  description: string;
  createdAt: string;
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-slate-400" />
          <h3 className="font-display font-semibold text-ink text-base">Aktivitas Terbaru</h3>
        </div>
        <Link
          href="/audit-log"
          className="text-xs font-medium text-accent hover:text-accent-light flex items-center gap-1"
        >
          Lihat semua <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400">Belum ada aktivitas tercatat.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="px-5 py-3 text-sm">
                <p className="text-ink">{item.description}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {item.userName} ·{" "}
                  {new Date(item.createdAt).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
