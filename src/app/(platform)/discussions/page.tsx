import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/server/current-user";
import { listDiscussions } from "@/server/queries";

export const metadata = { title: "Discussions" };

export default async function DiscussionsPage() {
  const user = await requireUser();
  const threads = await listDiscussions(user);
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Discussions</h1>
      <p className="mt-1 text-sm text-[#5e6875]">Les échanges restent attachés au document et à la section concernés.</p>
      <div className="mt-6 space-y-3">
        {threads.length === 0 ? <Card className="px-5 py-8 text-sm text-[#5e6875]">Aucune discussion.</Card> : null}
        {threads.map((thread) => (
          <Link key={thread.id} href={`/documents/${thread.documentId}?onglet=discussions`} className="block">
            <Card className="px-5 py-4 hover:border-[#c9d7fb]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-medium">{thread.title}</h2>
                <StatusBadge status={thread.status === "OPEN" ? "IN_DISCUSSION" : "RESOLVED"} kind="raw" />
              </div>
              <p className="mt-1 text-sm text-[#5e6875]">{thread.documentTitle}</p>
              {thread.lastBody ? <p className="mt-3 text-sm leading-6 text-[#3f4854]">{thread.lastAuthor} : {thread.lastBody}</p> : null}
              <p className="mt-2 text-xs text-[#8b939e]">{formatDateTime(thread.updatedAt)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
