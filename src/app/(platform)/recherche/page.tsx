import Link from "next/link";
import { requireUser } from "@/server/current-user";
import { searchPlatform } from "@/server/queries";

export const metadata = { title: "Recherche" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q = "" } = await searchParams;
  const result = await searchPlatform(user, q);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Recherche</h1>
      <p className="mt-1 text-sm text-[#5e6875]">{q ? `Résultats pour « ${q} »` : "Saisissez au moins deux caractères."}</p>
      <div className="mt-8 space-y-8">
        <Result title="Documents" empty="Aucun document.">
          {result.documents.map((item) => <Link key={item.id} href={`/documents/${item.id}`} className="block rounded-lg px-3 py-2 hover:bg-white">{item.title}<span className="ml-2 text-xs text-[#8b939e]">{item.typeLabel}</span></Link>)}
        </Result>
        <Result title="Espaces" empty="Aucun espace.">
          {result.workspaces.map((item) => <Link key={item.id} href={`/espaces/${item.id}`} className="block rounded-lg px-3 py-2 hover:bg-white">{item.name}</Link>)}
        </Result>
        <Result title="Personnes" empty="Aucune personne.">
          {result.people.map((item) => <p key={item.id} className="px-3 py-2">{item.name}<span className="ml-2 text-xs text-[#8b939e]">{item.email}</span></p>)}
        </Result>
        <Result title="Clauses" empty="Aucune clause.">
          {result.clauses.map((item) => <Link key={`${item.documentId}-${item.title}`} href={`/documents/${item.documentId}`} className="block rounded-lg px-3 py-2 hover:bg-white"><span className="font-medium">{item.title}</span><span className="mt-1 block text-xs text-[#8b939e]">{item.excerpt}</span></Link>)}
        </Result>
        <Result title="Discussions" empty="Aucune discussion.">
          {result.discussions.map((item) => <Link key={`${item.documentId}-${item.title}`} href={`/documents/${item.documentId}?onglet=discussions`} className="block rounded-lg px-3 py-2 hover:bg-white">{item.title}<span className="ml-2 text-xs text-[#8b939e]">{item.documentTitle}</span></Link>)}
        </Result>
      </div>
    </div>
  );
}

function Result({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const list = Array.isArray(children) ? children : [children];
  const visible = list.filter(Boolean);
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8b939e]">{title}</h2>
      <div className="mt-2">{visible.length ? visible : <p className="px-3 text-sm text-[#8b939e]">{empty}</p>}</div>
    </section>
  );
}
