import { AdminAction } from "@/components/admin-ui";
import { Notice, PageHead, Pager, SearchBar, Table, currentUrl, readSearch, type AdminSearch } from "@/components/admin-parts";
import { roleLabel } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import { cancelInvitationAction } from "@/server/actions/admin";
import { PAGE_SIZE, adminInvitations } from "@/server/admin";
import { requireAdmin } from "@/server/admin-auth";

export const metadata = { title: "Invitations" };

const PATH = "/admin/invitations";

export default async function AdminInvitations({ searchParams }: { searchParams: Promise<AdminSearch> }) {
  await requireAdmin();
  const params = await searchParams;
  const { q, page } = readSearch(params);
  const { total, rows } = await adminInvitations(q, page);
  const back = currentUrl(PATH, { q, page });

  return (
    <>
      <PageHead title="Invitations en attente" text="Annuler une invitation rend son lien inutilisable. La personne peut être réinvitée depuis l'entente." />
      <Notice ok={params.ok} erreur={params.erreur} />
      <SearchBar path={PATH} q={q} placeholder="Courriel invité ou espace" />
      <Table head={["Invité", "Pour", "Rôle", "Invité par", "Créée", "Envoyée", ""]} empty={rows.length === 0}>
        {rows.map((invitation) => (
          <tr key={invitation.id}>
            <td className="px-4 py-3 font-medium text-[#10233f]">{invitation.email}</td>
            <td className="px-4 py-3">
              <p>{invitation.documentTitle || invitation.workspace.name}</p>
              {invitation.documentTitle ? <p className="text-xs text-[#5e6875]">{invitation.workspace.name}</p> : null}
            </td>
            <td className="px-4 py-3">{roleLabel(invitation.role)}</td>
            <td className="px-4 py-3">{invitation.invitedBy.name}</td>
            <td className="px-4 py-3 whitespace-nowrap">{formatDate(invitation.createdAt)}</td>
            <td className="px-4 py-3 whitespace-nowrap">{invitation.sentAt ? formatDate(invitation.sentAt) : "Lien seulement"}</td>
            <td className="px-4 py-3 text-right">
              <AdminAction
                action={cancelInvitationAction}
                id={invitation.id}
                back={back}
                danger
                label="Annuler"
                confirm={`Annuler l'invitation de ${invitation.email} ?\n\nSon lien d'invitation ne fonctionnera plus.`}
              />
            </td>
          </tr>
        ))}
      </Table>
      <Pager path={PATH} page={page} total={total} size={PAGE_SIZE} params={{ q }} />
    </>
  );
}
