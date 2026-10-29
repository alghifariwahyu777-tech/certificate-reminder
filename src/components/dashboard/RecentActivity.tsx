import Link from "next/link";
import { Card, CardHead, EmptyState } from "@/components/ui/Card";

type ActivityItem = {
  id: string;
  userName: string;
  description: string;
  createdAt: string;
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="h-full">
      <CardHead
        title="Aktivitas terbaru"
        description="Perubahan data terakhir oleh pengguna"
        action={
          <Link href="/audit-log" className="text-[13px] font-semibold text-accent hover:text-accent-light">
            Lihat semua
          </Link>
        }
      />
      {items.length === 0 ? (
        <EmptyState>Belum ada aktivitas tercatat.</EmptyState>
      ) : (
        <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <div key={item.id} className="px-5 py-3 text-sm">
              <p className="text-ink dark:text-slate-100">{item.description}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {item.userName},{" "}
                {new Date(item.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
