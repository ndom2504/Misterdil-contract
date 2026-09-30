import Link from "next/link";
import { FileText } from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { formatShort } from "@/lib/format";
import { paletteColor } from "@/lib/palette";
import type { DocumentSummary } from "@/server/queries";

function DocumentIcon({ color }: { color: string }) {
  const tint = paletteColor(color);
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#2f6fed]"
      style={tint ? { backgroundColor: tint.soft, color: tint.hex } : undefined}
    >
      <FileText className="h-4 w-4" />
    </span>
  );
}

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
        <li key={document.id} className="relative">
          <span className="absolute inset-y-2 left-0 w-1 rounded-r-full" style={{ backgroundColor: paletteColor(document.color)?.hex ?? "transparent" }} />
          <Link href={hrefFor(document)} className="block px-4 py-3 active:bg-[#f7f9fc]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <DocumentIcon color={document.color} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#10233f]">{document.title}</p>
                  <p className="truncate text-xs text-[#8b939e]">{document.typeLabel} · {document.workspaceName}</p>
                </div>
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
              <td className="relative px-5 py-4">
                <span className="absolute inset-y-3 left-0 w-1 rounded-r-full" style={{ backgroundColor: paletteColor(document.color)?.hex ?? "transparent" }} />
                <div className="flex items-center gap-3">
                  <DocumentIcon color={document.color} />
                  <div className="min-w-0">
                    <Link href={hrefFor(document)} className="font-medium hover:text-[#1e4ed8]">
                      {document.title}
                    </Link>
                    <p className="text-xs text-[#8b939e]">{document.workspaceName}</p>
                  </div>
                </div>
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
