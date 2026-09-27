import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/server/current-user";
import { listSignatureTasks } from "@/server/queries";

export const metadata = { title: "Signatures" };

export default async function SignaturesPage() {
  const user = await requireUser();
  const items = await listSignatureTasks(user);
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Signatures</h1>
      <p className="mt-1 text-sm text-[#5e6875]">Journal des signatures requises et des signatures déjà apposées.</p>
      <div className="mt-6 space-y-3">
        {items.length === 0 ? <Card className="px-5 py-8 text-sm text-[#5e6875]">Aucune signature en cours.</Card> : null}
        {items.map((item) => (
          <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <Link href={`/documents/${item.documentId}?onglet=signature`} className="font-medium hover:text-[#1e4ed8]">{item.documentTitle}</Link>
              <p className="mt-1 text-sm text-[#5e6875]">{item.name} · {item.organization}</p>
              {item.signedAt ? <p className="mt-1 text-xs text-[#8b939e]">Signé le {formatDateTime(item.signedAt)}</p> : null}
            </div>
            <StatusBadge status={item.status === "SIGNED" ? "SIGNED" : "REQUIRED"} kind="raw" />
          </Card>
        ))}
      </div>
    </div>
  );
}
