import Link from "next/link";
import { AdminAction } from "@/components/admin-ui";
import { Notice, PageHead, Pager, SearchBar, Table, currentUrl, readSearch, type AdminSearch } from "@/components/admin-parts";
import { documentStatusLabel } from "@/lib/domain";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { deleteDocumentAction, deleteWorkspaceAction } from "@/server/actions/admin";
import { PAGE_SIZE, adminDocuments, adminWorkspaces } from "@/server/admin";
import { requireAdmin } from "@/server/admin-auth";

export const metadata = { title: "Espaces et ententes" };

const PATH = "/admin/contenu";

export default async function AdminContent({ searchParams }: { searchParams: Promise<AdminSearch> }) {
  await requireAdmin();
  const params = await searchParams;
  const { q, page } = readSearch(params);
  const view = params.vue === "espaces" ? "espaces" : "ententes";
  const back = currentUrl(PATH, { vue: view, q, page });

  return (
    <>
      <PageHead title="Espaces et ententes" text="Les parties concernées sont notifiées quand l'administration supprime un espace ou une entente." />
      <Notice ok={params.ok} erreur={params.erreur} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-[#e6e8ee] bg-white p-1 text-sm">
          {(["ententes", "espaces"] as const).map((item) => (
            <Link
              key={item}
              href={currentUrl(PATH, { vue: item })}
              className={cn("rounded-md px-3 py-1.5", view === item ? "bg-[#10233f] text-white" : "text-[#3f4854] hover:bg-[#f5f7fb]")}>
              {item === "ententes" ? "Ententes" : "Espaces"}
            </Link>
          ))}
        </div>
        <div className="min-w-64 flex-1">
          <SearchBar path={PATH} q={q} extra={{ vue: view }} placeholder={view === "ententes" ? "Titre, espace ou modérateur" : "Nom de l'espace ou organisation"} />
        </div>
      </div>
      {view === "ententes" ? <Documents q={q} page={page} back={back} /> : <Workspaces q={q} page={page} back={back} />}
    </>
  );
}

async function Documents({ q, page, back }: { q: string; page: number; back: string }) {
  const { total, rows } = await adminDocuments(q, page);
  return (
    <>
      <Table head={["Entente", "Espace", "Modérateur", "Statut", "Parties", "Messages", "Modifiée", ""]} empty={rows.length === 0}>
        {rows.map((document) => (
          <tr key={document.id}>
            <td className="px-4 py-3">
              <p className="font-medium text-[#10233f]">{document.title}</p>
              <p className="text-xs text-[#5e6875]">{document.type.label}</p>
            </td>
            <td className="px-4 py-3">{document.workspace.name}</td>
            <td className="px-4 py-3">{document.moderator?.name ?? "—"}</td>
            <td className="px-4 py-3 whitespace-nowrap">{documentStatusLabel(document.status)}</td>
            <td className="px-4 py-3">{document._count.stakeholders}</td>
            <td className="px-4 py-3">{document._count.messages}</td>
            <td className="px-4 py-3 whitespace-nowrap">{formatDate(document.updatedAt)}</td>
            <td className="px-4 py-3 text-right">
              <AdminAction
                action={deleteDocumentAction}
                id={document.id}
                back={back}
                danger
                label="Supprimer"
                confirm={`Supprimer l'entente « ${document.title} » ?\n\nSections, discussion et fichiers seront effacés pour toutes les parties. Cette action est irréversible.`}
              />
            </td>
          </tr>
        ))}
      </Table>
      <Pager path={PATH} page={page} total={total} size={PAGE_SIZE} params={{ vue: "ententes", q }} />
    </>
  );
}

async function Workspaces({ q, page, back }: { q: string; page: number; back: string }) {
  const { total, rows } = await adminWorkspaces(q, page);
  return (
    <>
      <Table head={["Espace", "Organisation", "Membres", "Ententes", "Fichiers", "Créé", ""]} empty={rows.length === 0}>
        {rows.map((workspace) => (
          <tr key={workspace.id}>
            <td className="px-4 py-3 font-medium text-[#10233f]">{workspace.name}</td>
            <td className="px-4 py-3">{workspace.organization.name}</td>
            <td className="px-4 py-3">{workspace._count.members}</td>
            <td className="px-4 py-3">{workspace._count.documents}</td>
            <td className="px-4 py-3">{workspace._count.attachments}</td>
            <td className="px-4 py-3 whitespace-nowrap">{formatDate(workspace.createdAt)}</td>
            <td className="px-4 py-3 text-right">
              <AdminAction
                action={deleteWorkspaceAction}
                id={workspace.id}
                back={back}
                danger
                label="Supprimer"
                confirm={`Supprimer l'espace « ${workspace.name} » ?\n\nSes ${workspace._count.documents} entente(s), leurs discussions et tous les fichiers seront effacés pour toutes les parties. Cette action est irréversible.`}
              />
            </td>
          </tr>
        ))}
      </Table>
      <Pager path={PATH} page={page} total={total} size={PAGE_SIZE} params={{ vue: "espaces", q }} />
    </>
  );
}
