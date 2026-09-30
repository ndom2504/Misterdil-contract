import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui";
import { UploadForm, WorkspaceSettings } from "@/components/workspace-tools";
import { fileSize } from "@/lib/format";
import { roleLabel } from "@/lib/domain";
import { requireUser } from "@/server/current-user";
import { getWorkspace } from "@/server/queries";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const workspace = await getWorkspace(user, id);
  if (!workspace) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#5e6875]">{workspace.organization}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{workspace.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5e6875]">{workspace.description}</p>
        </div>
        <WorkspaceSettings workspace={{ id: workspace.id, name: workspace.name, documents: workspace.documents.length, canDelete: workspace.canDelete }} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm text-[#5e6875]">Participants</p><p className="mt-1 text-2xl font-semibold">{workspace.members.length}</p></Card>
        <Card className="p-4"><p className="text-sm text-[#5e6875]">Documents</p><p className="mt-1 text-2xl font-semibold">{workspace.documents.length}</p></Card>
        <Card className="p-4"><ProgressBar value={workspace.progress.percent} /></Card>
      </div>
      <Card>
        <div className="flex items-center justify-between border-b border-[#eef0f3] px-5 py-4">
          <h2 className="font-semibold">Documents</h2>
          <Link href="/documents/nouveau" className="text-sm font-medium text-[#1e4ed8]">Nouvelle entente</Link>
        </div>
        <ul className="divide-y divide-[#f2f3f6]">
          {workspace.documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <Link href={document.status === "DRAFT" ? `/documents/nouveau?brouillon=${document.id}` : `/documents/${document.id}`} className="font-medium hover:text-[#1e4ed8]">{document.title}</Link>
                <p className="text-sm text-[#5e6875]">{document.typeLabel} · {document.participants} participants · Modérateur : {document.moderatorName}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32"><ProgressBar value={document.progress.percent} label="" /></div>
                <StatusBadge status={document.status} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Participants</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {workspace.members.map((member) => (
              <li key={member.id}>
                <p className="font-medium">{member.name}</p>
                <p className="text-[#5e6875]">{roleLabel(member.role)} · {member.organization}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Documents associés</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {workspace.attachments.map((file) => (
              <li key={file.id} className="flex justify-between gap-3">
                <a className="text-[#1e4ed8]" href={`/api/attachments/${file.id}`}>{file.name}</a>
                <span className="text-[#8b939e]">{fileSize(file.size)}</span>
              </li>
            ))}
            {workspace.attachments.length === 0 ? <li className="text-[#5e6875]">Aucun fichier.</li> : null}
          </ul>
          {workspace.canManage || workspace.role === "PARTICIPANT" ? <div className="mt-4"><UploadForm workspaceId={workspace.id} /></div> : null}
        </Card>
      </div>
    </div>
  );
}
