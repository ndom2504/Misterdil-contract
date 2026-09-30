import Link from "next/link";
import { Card } from "@/components/ui";
import { PageHead, Stat } from "@/components/admin-parts";
import { documentStatusLabel } from "@/lib/domain";
import { formatDateTime, formatRelative } from "@/lib/format";
import { adminStats } from "@/server/admin";
import { requireAdmin } from "@/server/admin-auth";

export const metadata = { title: "Tableau de bord" };

export default async function AdminDashboard() {
  await requireAdmin();
  const stats = await adminStats();
  return (
    <>
      <PageHead title="Tableau de bord" text="Vue d'ensemble de la plateforme Misterdil." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Utilisateurs" value={stats.users} hint={`+${stats.users7} en 7 jours · +${stats.users30} en 30 jours`} />
        <Stat label="Profils complétés" value={stats.onboarded} hint={stats.disabled ? `${stats.disabled} compte${stats.disabled > 1 ? "s" : ""} désactivé${stats.disabled > 1 ? "s" : ""}` : "Aucun compte désactivé"} />
        <Stat label="Espaces" value={stats.workspaces} />
        <Stat label="Ententes" value={stats.documents} hint={`${stats.signed} signature${stats.signed > 1 ? "s" : ""} enregistrée${stats.signed > 1 ? "s" : ""}`} />
        <Stat label="Messages (7 jours)" value={stats.messages7} />
        <Stat label="Invitations en attente" value={stats.invitations} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-semibold text-[#10233f]">Ententes par statut</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {stats.byStatus.map((item) => (
              <li key={item.status} className="flex items-center justify-between gap-3">
                <span className="text-[#3f4854]">{documentStatusLabel(item.status)}</span>
                <span className="font-medium text-[#10233f]">{item.count}</span>
              </li>
            ))}
            {stats.byStatus.length === 0 ? <li className="text-[#8b939e]">Aucune entente.</li> : null}
          </ul>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#10233f]">Dernières inscriptions</h2>
            <Link href="/admin/utilisateurs" className="text-sm text-[#1e4ed8]">Tous les utilisateurs</Link>
          </div>
          <ul className="mt-3 divide-y divide-[#f2f3f6] text-sm">
            {stats.recentUsers.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#10233f]">{user.name}</p>
                  <p className="truncate text-xs text-[#5e6875]">
                    {user.email}
                    {user.organization ? ` · ${user.organization.name}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[#8b939e]">{formatRelative(user.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold text-[#10233f]">Activité récente</h2>
        <ul className="mt-3 divide-y divide-[#f2f3f6] text-sm">
          {stats.activities.map((activity) => (
            <li key={activity.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <p className="text-[#3f4854]">
                {activity.message}
                {activity.workspace ? <span className="text-[#8b939e]"> · {activity.workspace.name}</span> : null}
              </p>
              <span className="text-xs text-[#8b939e]">{formatDateTime(activity.createdAt)}</span>
            </li>
          ))}
          {stats.activities.length === 0 ? <li className="py-2 text-[#8b939e]">Aucune activité.</li> : null}
        </ul>
      </Card>
    </>
  );
}
