import Link from "next/link";
import { ProgressBar } from "@/components/progress-bar";
import { Card } from "@/components/ui";
import { WorkspaceCreator } from "@/components/workspace-tools";
import { roleLabel } from "@/lib/domain";
import { requireUser } from "@/server/current-user";
import { listWorkspaces } from "@/server/queries";

export const metadata = { title: "Mes espaces" };

export default async function WorkspacesPage() {
  const user = await requireUser();
  const workspaces = await listWorkspaces(user);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes espaces</h1>
          <p className="mt-1 text-sm text-[#5e6875]">Chaque projet a son espace sécurisé.</p>
        </div>
        <WorkspaceCreator />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {workspaces.map((workspace) => (
          <Link key={workspace.id} href={`/espaces/${workspace.id}`}>
            <Card className="h-full p-5 hover:border-[#c9d7fb]">
              <p className="text-xs text-[#8b939e]">{workspace.sector}{workspace.domain ? ` · ${workspace.domain}` : ""}</p>
              <h2 className="mt-1 text-lg font-semibold">{workspace.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5e6875]">{workspace.description}</p>
              <div className="mt-4"><ProgressBar value={workspace.progress.percent} /></div>
              <p className="mt-3 text-xs text-[#8b939e]">{workspace.participants} participants · {workspace.documents.length} document{workspace.documents.length > 1 ? "s" : ""} · {roleLabel(workspace.role)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
