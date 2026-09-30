import { AdminAction } from "@/components/admin-ui";
import { Notice, PageHead, Pager, SearchBar, Table, currentUrl, readSearch, type AdminSearch } from "@/components/admin-parts";
import { formatDate } from "@/lib/format";
import { deleteUserAction, toggleUserAction } from "@/server/actions/admin";
import { PAGE_SIZE, adminUsers } from "@/server/admin";
import { requireAdmin } from "@/server/admin-auth";

export const metadata = { title: "Utilisateurs" };

const PATH = "/admin/utilisateurs";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<AdminSearch> }) {
  await requireAdmin();
  const params = await searchParams;
  const { q, page } = readSearch(params);
  const { total, rows } = await adminUsers(q, page);
  const back = currentUrl(PATH, { q, page });

  return (
    <>
      <PageHead title="Utilisateurs" text="Désactiver un compte ferme ses sessions sur le web et le mobile ; il peut être réactivé. La suppression est définitive." />
      <Notice ok={params.ok} erreur={params.erreur} />
      <SearchBar path={PATH} q={q} placeholder="Nom, courriel ou organisation" />
      <Table head={["Utilisateur", "Organisation", "Inscription", "Espaces", "Ententes créées", "Statut", ""]} empty={rows.length === 0}>
        {rows.map((user) => {
          const disabled = Boolean(user.disabledAt);
          return (
            <tr key={user.id} className={disabled ? "bg-[#fafafa] text-[#8b939e]" : undefined}>
              <td className="px-4 py-3">
                <p className="font-medium text-[#10233f]">{user.name}</p>
                <p className="text-xs text-[#5e6875]">
                  {user.email}
                  {user.microsoft ? " · Microsoft" : ""}
                </p>
              </td>
              <td className="px-4 py-3">{user.organization?.name ?? "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(user.createdAt)}</td>
              <td className="px-4 py-3">{user._count.memberships}</td>
              <td className="px-4 py-3">{user._count.documents}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    disabled
                      ? "rounded-full bg-[#fdecec] px-2 py-0.5 text-xs text-[#b42318]"
                      : user.onboarded
                        ? "rounded-full bg-[#e7f8ee] px-2 py-0.5 text-xs text-[#14804a]"
                        : "rounded-full bg-[#fff4e5] px-2 py-0.5 text-xs text-[#8a4b00]"
                  }>
                  {disabled ? "Désactivé" : user.onboarded ? "Actif" : "Profil incomplet"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <AdminAction
                    action={toggleUserAction}
                    id={user.id}
                    back={back}
                    fields={{ disable: disabled ? "0" : "1" }}
                    label={disabled ? "Réactiver" : "Désactiver"}
                    confirm={disabled ? `Réactiver le compte de ${user.name} ?` : `Désactiver le compte de ${user.name} ?\n\nSes sessions seront fermées et il ne pourra plus se connecter.`}
                  />
                  <AdminAction
                    action={deleteUserAction}
                    id={user.id}
                    back={back}
                    danger
                    label="Supprimer"
                    confirm={`Supprimer définitivement le compte de ${user.name} (${user.email}) ?\n\nS'il a créé des ententes ou des documents partagés, le compte est anonymisé pour que les autres parties les conservent. Cette action est irréversible.`}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
      <Pager path={PATH} page={page} total={total} size={PAGE_SIZE} params={{ q }} />
    </>
  );
}
