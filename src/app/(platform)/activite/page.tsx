import Link from "next/link";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/server/current-user";
import { listActivity } from "@/server/queries";

export const metadata = { title: "Activité" };

export default async function ActivityPage() {
  const user = await requireUser();
  const items = await listActivity(user);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Activité</h1>
      <p className="mt-1 text-sm text-[#5e6875]">Chaque modification importante reste traçable.</p>
      <Card className="mt-6 divide-y divide-[#f2f3f6]">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="block px-5 py-4 hover:bg-[#fafbfc]">
            <p className="text-sm">{item.message}</p>
            <p className="mt-1 text-xs text-[#8b939e]">{formatDateTime(item.createdAt)}</p>
          </Link>
        ))}
      </Card>
    </div>
  );
}
