import Link from "next/link";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { formatShort } from "@/lib/format";
import type { DocumentSummary } from "@/server/queries";

export function DocumentTable({ documents }: { documents: DocumentSummary[] }) {
  if (!documents.length) {
    return <p className="px-5 py-8 text-sm text-[#5e6875]">Aucun document pour le moment.</p>;
  }

  const hrefFor = (document: DocumentSummary) =>
    document.status === "DRAFT" && document.progress.total === 0 ? `/documents/nouveau?brouillon=${document.id}` : `/documents/${document.id}`;

  return (
    <>
    <ul className="divide-y divide-[#f2f3f6] border-t border-[#eef0f3] sm:hidden">
      {documents.map((document) => (
        <li key={document.id}>
          <Link href={hrefFor(document)} className="block px-4 py-3 active:bg-[#f7f9fc]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#10233f]">{document.title}</p>
                <p className="truncate text-xs text-[#8b939e]">{document.typeLabel} · {document.workspaceName}</p>
              </div>
              <StatusBadge status={document.status} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="min-w-0 flex-1"><ProgressBar value={document.progress.percent} label="" /></div>
              <span className="shrink-0 text-[11px] text-[#8b939e]">{formatShort(document.updatedAt)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-[#eef0f3] text-xs uppercase tracking-wide text-[#8b939e]">
          <tr>
            <th className="px-5 py-3 font-medium">Document</th>
            <th className="px-3 py-3 font-medium">Type</th>
            <th className="px-3 py-3 font-medium">Participants</th>
            <th className="px-3 py-3 font-medium">Progression</th>
            <th className="px-3 py-3 font-medium">Statut</th>
            <th className="px-5 py-3 font-medium">Dernière modification</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id} className="border-b border-[#f2f3f6] last:border-0">
              <td className="px-5 py-4">
                <Link href={hrefFor(document)} className="font-medium hover:text-[#1e4ed8]">
                  {document.title}
                </Link>
                <p className="text-xs text-[#8b939e]">{document.workspaceName}</p>
              </td>
              <td className="px-3 py-4 text-[#3f4854]">{document.typeLabel}</td>
              <td className="px-3 py-4 text-[#3f4854]">{document.participants}</td>
              <td className="w-40 px-3 py-4"><ProgressBar value={document.progress.percent} label="" /></td>
              <td className="px-3 py-4"><StatusBadge status={document.status} /></td>
              <td className="px-5 py-4 text-[#5e6875]">{formatShort(document.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
