import Link from "next/link";
import { markNotificationsRead } from "@/server/actions/assistant";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/server/current-user";
import { listNotifications } from "@/server/queries";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-[#5e6875]">Invitations, discussions, validations et signatures.</p>
        </div>
        <form action={markNotificationsRead}>
          <button className="text-sm font-medium text-[#1e4ed8]">Tout marquer comme lu</button>
        </form>
      </div>
      <div className="mt-6 space-y-3">
        {items.length === 0 ? <Card className="px-5 py-8 text-sm text-[#5e6875]">Aucune notification.</Card> : null}
        {items.map((item) => (
          <Link key={item.id} href={item.href || "/notifications"}>
            <Card className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={item.read ? "text-sm text-[#5e6875]" : "text-sm font-medium"}>{item.title}</p>
                  {item.body ? <p className="mt-1 text-sm text-[#5e6875]">{item.body}</p> : null}
                </div>
                {!item.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1e4ed8]" /> : null}
              </div>
              <p className="mt-2 text-xs text-[#8b939e]">{formatDateTime(item.createdAt)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
