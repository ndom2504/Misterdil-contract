import Link from "next/link";
import { MessagesSquare, Phone } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { listConversations } from "@/server/chat";
import { requireUser } from "@/server/current-user";
import { listDiscussions } from "@/server/queries";

export const metadata = { title: "Discussions" };

export default async function DiscussionsPage() {
  const user = await requireUser();
  const [conversations, threads] = await Promise.all([listConversations(user), listDiscussions(user)]);
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Discussions</h1>
        <p className="mt-1 text-sm text-[#5e6875]">Chaque entente a sa discussion de groupe et ses appels audio avec toutes les parties prenantes.</p>
        <div className="mt-6 space-y-3">
          {conversations.length === 0 ? <Card className="px-5 py-8 text-sm text-[#5e6875]">Aucune entente pour l&apos;instant.</Card> : null}
          {conversations.map((item) => (
            <Link key={item.documentId} href={`/documents/${item.documentId}?onglet=discussion`} className="block">
              <Card className="flex items-start gap-4 px-5 py-4 hover:border-[#c9d7fb]">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f0ff] text-[#2f6fed]">
                  <MessagesSquare className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="truncate font-medium">{item.title}</h2>
                    <span className="shrink-0 text-xs text-[#8b939e]">{formatDateTime(item.updatedAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-[#5e6875]">
                    {item.lastMessage ? (
                      item.lastMessage.kind === "CALL" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {item.lastMessage.body}
                        </span>
                      ) : (
                        `${item.lastMessage.authorName} : ${item.lastMessage.body}`
                      )
                    ) : (
                      `${item.typeLabel} · ${item.participants} partie${item.participants > 1 ? "s" : ""} prenante${item.participants > 1 ? "s" : ""}`
                    )}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {threads.length ? (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">Commentaires sur les sections</h2>
          <p className="mt-1 text-sm text-[#5e6875]">Les échanges restent attachés au document et à la section concernés.</p>
          <div className="mt-4 space-y-3">
            {threads.map((thread) => (
              <Link key={thread.id} href={`/documents/${thread.documentId}?onglet=discussions`} className="block">
                <Card className="px-5 py-4 hover:border-[#c9d7fb]">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-medium">{thread.title}</h3>
                    <StatusBadge status={thread.status === "OPEN" ? "IN_DISCUSSION" : "RESOLVED"} kind="raw" />
                  </div>
                  <p className="mt-1 text-sm text-[#5e6875]">{thread.documentTitle}</p>
                  {thread.lastBody ? <p className="mt-3 text-sm leading-6 text-[#3f4854]">{thread.lastAuthor} : {thread.lastBody}</p> : null}
                  <p className="mt-2 text-xs text-[#8b939e]">{formatDateTime(thread.updatedAt)}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
