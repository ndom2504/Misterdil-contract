import Image from "next/image";
import Link from "next/link";
import { Clock, Eye, FileText, Filter, MessageSquare, PenLine, Plus, Sparkles } from "lucide-react";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { formatRelative } from "@/lib/format";
import { paletteColor } from "@/lib/palette";
import { requireUser } from "@/server/current-user";
import { getDashboard, listDocuments, listWorkspaces, type DocumentSummary } from "@/server/queries";

export const metadata = { title: "Documents" };

const views = [
  { id: "tous", label: "Tous" },
  { id: "recents", label: "Récents" },
  { id: "miens", label: "Mes documents" },
  { id: "partages", label: "Partagés" },
  { id: "validation", label: "À valider" },
  { id: "finalises", label: "Finalisés" },
] as const;

type ViewId = (typeof views)[number]["id"];

function spaceImage(sector: string) {
  const value = sector.toLowerCase();
  if (value.includes("sant")) return "/brand/sectors/sante.jpg";
  if (value.includes("construct")) return "/brand/sectors/construction.jpg";
  if (value.includes("transport") || value.includes("logist")) return "/brand/sectors/transport.jpg";
  if (value.includes("financ")) return "/brand/sectors/finance.jpg";
  if (value.includes("commerc")) return "/brand/sectors/commerce.jpg";
  if (value.includes("industr")) return "/brand/sectors/industrie.jpg";
  if (value.includes("admin") || value.includes("public")) return "/brand/sectors/administration.jpg";
  if (value.includes("éduc") || value.includes("educ")) return "/brand/sectors/education.jpg";
  if (value.includes("service") || value.includes("conseil")) return "/brand/sectors/services.jpg";
  return "/brand/sectors/technologie.jpg";
}

function documentHref(document: DocumentSummary) {
  return document.status === "DRAFT" && document.progress.total === 0
    ? `/documents/nouveau?brouillon=${document.id}`
    : `/documents/${document.id}`;
}

function matches(document: DocumentSummary, view: ViewId) {
  if (view === "miens") return document.owned;
  if (view === "partages") return !document.owned;
  if (view === "validation") return document.status === "PENDING_VALIDATION";
  if (view === "finalises") return document.status === "FINAL";
  if (view === "recents") return Date.now() - new Date(document.updatedAt).getTime() < 1000 * 60 * 60 * 24 * 14;
  return true;
}

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const user = await requireUser();
  const { vue } = await searchParams;
  const view = views.some((item) => item.id === vue) ? (vue as ViewId) : "tous";
  const [documents, workspaces, dashboard] = await Promise.all([listDocuments(user), listWorkspaces(user), getDashboard(user)]);
  const visible = documents.filter((document) => matches(document, view));
  const counts = {
    total: documents.length,
    discussion: documents.filter((document) => document.status === "IN_DISCUSSION").length,
    validation: documents.filter((document) => document.status === "PENDING_VALIDATION").length,
    signature: documents.filter((document) => document.status === "PENDING_SIGNATURE").length,
  };
  const priorities = [
    counts.validation ? { href: "/documents?vue=validation", title: `${counts.validation} validation${counts.validation > 1 ? "s" : ""} en attente`, detail: "Contrats et cahiers des charges", icon: Clock, tint: "bg-[#fff4e5] text-[#e07a12]" } : null,
    counts.discussion ? { href: "/documents?vue=tous", title: `${counts.discussion} document${counts.discussion > 1 ? "s" : ""} en discussion`, detail: "Points encore ouverts", icon: MessageSquare, tint: "bg-[#e8f0ff] text-[#2f6fed]" } : null,
    counts.signature ? { href: "/documents?vue=tous", title: `${counts.signature} signature${counts.signature > 1 ? "s" : ""} à préparer`, detail: "Documents prêts à faire signer", icon: PenLine, tint: "bg-[#f3eaff] text-[#7a3ff2]" } : null,
  ].filter((item) => item !== null);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#10233f]">Mes documents</h1>
            <p className="mt-1 text-sm text-[#5e6875]">Gérez, collaborez et suivez vos documents en un seul endroit.</p>
          </div>
          <div className="flex items-center gap-2">
            <details className="relative">
              <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-[#e6eef8] bg-white px-4 text-sm font-medium text-[#243040] shadow-sm">
                <Filter className="h-4 w-4" />
                Filtres
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-48 rounded-2xl border border-[#e6eef8] bg-white p-2 shadow-lg">
                {views.map((item) => (
                  <Link key={item.id} href={item.id === "tous" ? "/documents" : `/documents?vue=${item.id}`} className="block rounded-xl px-3 py-2 text-sm hover:bg-[#f4f7fb]">
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
            <Link href="/documents/nouveau" className="inline-flex h-10 items-center gap-1 rounded-full bg-[#2f6fed] px-4 text-sm font-medium text-white hover:bg-[#245bd0]">
              <Plus className="h-4 w-4" />
              Nouveau document
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Tous les documents", value: counts.total, icon: FileText, tint: "bg-[#e8f0ff] text-[#2f6fed]" },
            { label: "En discussion", value: counts.discussion, icon: MessageSquare, tint: "bg-[#fff4e5] text-[#e07a12]" },
            { label: "À valider", value: counts.validation, icon: Clock, tint: "bg-[#f3eaff] text-[#7a3ff2]" },
            { label: "À signer", value: counts.signature, icon: PenLine, tint: "bg-[#e7f8ee] text-[#14804a]" },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-[#e6eef8] bg-white px-4 py-4 shadow-sm">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tint}`}>
                <item.icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[#10233f]">{item.value}</p>
              <p className="text-xs text-[#6b7280]">{item.label}</p>
            </article>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#e6eef8] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-4 py-3">
            <div className="flex flex-wrap gap-1">
              {views.map((item) => {
                const active = item.id === view;
                return (
                  <Link
                    key={item.id}
                    href={item.id === "tous" ? "/documents" : `/documents?vue=${item.id}`}
                    className={active ? "rounded-full bg-[#e8f0ff] px-3 py-1.5 text-sm font-medium text-[#2f6fed]" : "rounded-full px-3 py-1.5 text-sm text-[#5e6875] hover:bg-[#f4f7fb]"}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <span className="text-xs text-[#8b939e]">Plus récent</span>
          </div>
          {visible.length === 0 ? <p className="px-5 py-8 text-sm text-[#5e6875]">Aucun document dans cette vue.</p> : null}
          {visible.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-[#8b939e]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Document</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Espace</th>
                    <th className="px-3 py-3 font-medium">Progression</th>
                    <th className="px-3 py-3 font-medium">Statut</th>
                    <th className="px-3 py-3 font-medium">Modifié</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((document) => (
                    <tr key={document.id} className="border-t border-[#f2f5f9]">
                      <td className="relative px-5 py-4">
                        <span className="absolute inset-y-3 left-0 w-1 rounded-r-full" style={{ backgroundColor: paletteColor(document.color)?.hex ?? "transparent" }} />
                        <Link href={documentHref(document)} className="flex items-start gap-3">
                          <span
                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f0ff] text-[#2f6fed]"
                            style={paletteColor(document.color) ? { backgroundColor: paletteColor(document.color)?.soft, color: paletteColor(document.color)?.hex } : undefined}
                          >
                            <FileText className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block font-medium text-[#10233f]">{document.title}</span>
                            <span className="block max-w-xs truncate text-xs text-[#8b939e]">{document.description || document.domain || document.sectorLabel}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-4 text-[#3f4854]">{document.typeLabel}</td>
                      <td className="px-3 py-4">
                        <Link href={`/espaces/${document.workspaceId}`} className="text-[#2f6fed] hover:underline">{document.workspaceName}</Link>
                      </td>
                      <td className="w-36 px-3 py-4">
                        <ProgressBar value={document.progress.percent} label="" />
                      </td>
                      <td className="px-3 py-4"><StatusBadge status={document.status} /></td>
                      <td className="px-3 py-4 text-xs text-[#5e6875]">{formatRelative(document.updatedAt)}</td>
                      <td className="px-5 py-4">
                        <Link href={documentHref(document)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5e6875] hover:bg-[#f4f7fb]" aria-label={`Ouvrir ${document.title}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-[#10233f]">Dernière activité</h2>
              <Link href="/activite" className="text-sm text-[#2f6fed]">Voir tout</Link>
            </div>
            <ul className="space-y-3">
              {dashboard.activities.length === 0 ? <li className="text-sm text-[#6b7280]">Aucune activité pour le moment.</li> : null}
              {dashboard.activities.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="block text-sm leading-5 text-[#243040] hover:text-[#2f6fed]">
                    {item.message}
                    <span className="mt-0.5 block text-xs text-[#8b939e]">{formatRelative(item.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-[#10233f]">Mes espaces</h2>
              <Link href="/espaces" className="text-sm text-[#2f6fed]">Voir tout</Link>
            </div>
            <ul className="space-y-3">
              {workspaces.slice(0, 4).map((workspace) => (
                <li key={workspace.id}>
                  <Link href={`/espaces/${workspace.id}`} className="flex items-center gap-3">
                    <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg">
                      <Image src={spaceImage(workspace.sector)} alt="" fill className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#10233f]">{workspace.name}</span>
                      <span className="block text-xs text-[#6b7280]">{workspace.documents.length} document{workspace.documents.length > 1 ? "s" : ""} · {workspace.participants} participant{workspace.participants > 1 ? "s" : ""}</span>
                      <span className="mt-1 block"><ProgressBar value={workspace.progress.percent} label="" /></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-[#d7e6ff] bg-[#f3f8ff] p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#2f6fed]" />
            <p className="text-sm font-semibold text-[#10233f]">Assistant Misterdil</p>
          </div>
          <p className="text-sm leading-5 text-[#3f4854]">
            {priorities.length > 0
              ? `J'ai identifié ${priorities.length} sujet${priorities.length > 1 ? "s" : ""} nécessitant votre attention.`
              : "Aucun document ne demande une action immédiate."}
          </p>
          <ul className="mt-3 space-y-2">
            {priorities.map((item) => (
              <li key={item.title}>
                <Link href={item.href} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.tint}`}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-[#10233f]">{item.title}</span>
                    <span className="block text-xs text-[#6b7280]">{item.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {counts.validation > 0 ? (
            <Link href="/documents?vue=validation" className="mt-3 flex h-10 items-center justify-center rounded-full border border-[#d7e3f8] bg-white text-sm font-medium text-[#2f6fed]">
              Voir les priorités
            </Link>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-[#10233f]">Documents récemment ouverts</h2>
          </div>
          <ul className="space-y-3">
            {documents.slice(0, 5).map((document) => (
              <li key={document.id}>
                <Link href={documentHref(document)} className="flex items-start gap-2 text-sm">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#2f6fed]" style={paletteColor(document.color) ? { color: paletteColor(document.color)?.hex } : undefined} />
                  <span>
                    <span className="block font-medium text-[#10233f]">{document.title}</span>
                    <span className="block text-xs text-[#8b939e]">{formatRelative(document.updatedAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
