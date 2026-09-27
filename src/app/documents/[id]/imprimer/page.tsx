import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { partyLabel } from "@/lib/domain";
import { getCurrentUser } from "@/server/current-user";
import { loadDocumentForUser } from "@/server/guard";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const loaded = await loadDocumentForUser(id, user);
  if (!loaded) notFound();
  const document = loaded.document;
  const sections = [...document.sections].sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-white text-[#12151a]">
      <div className="no-print mx-auto flex max-w-3xl items-center justify-between px-8 py-6">
        <p className="text-sm text-[#5e6875]">Mise en page d&apos;impression</p>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-3xl px-8 pb-16">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#1e4ed8]">MISTERDIL</p>
        <h1 className="mt-3 text-3xl font-semibold">{document.title}</h1>
        <p className="mt-2 text-sm text-[#5e6875]">Modérateur : {document.moderator?.name ?? "Non désigné"}</p>
        <div className="mt-8 space-y-6">
          {sections.map((section, index) => (
            <section key={section.id}>
              <h2 className="text-lg font-semibold">{index + 1}. {section.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{section.content}</p>
            </section>
          ))}
        </div>
        <h2 className="mt-10 text-lg font-semibold">Signatures</h2>
        <div className="mt-4 grid gap-8 sm:grid-cols-2">
          {document.stakeholders.map((party) => (
            <div key={party.id}>
              <p className="text-sm font-medium">{party.organization || party.name}</p>
              <p className="text-sm text-[#5e6875]">{partyLabel(party.partyType)}</p>
              <div className="mt-10 border-t border-[#d5d8e0] pt-2 text-xs text-[#8b939e]">Signature</div>
            </div>
          ))}
        </div>
      </article>
      <style>{`@media print { .no-print { display: none } body { background: white } }`}</style>
    </div>
  );
}
