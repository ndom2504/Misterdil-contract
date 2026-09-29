"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Clock, FileText, Mail, MessageSquare, PenLine, Printer, Search, Users, Video } from "lucide-react";
import { addComment, approveParticipation, createProposal, proposeFormulation, requestValidation, resolveProposal, saveParties, sendForSignature, setDiscussionStatus, setModerator, signDocument } from "@/server/actions/collaboration";
import { setSectionStatus, updateSectionContent } from "@/server/actions/documents";
import { AssistantPanel } from "@/components/assistant-panel";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button, Card, Field, controlClass } from "@/components/ui";
import { partyLabel, sectionStatusLabel } from "@/lib/domain";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { getDocumentView } from "@/server/queries";

type View = NonNullable<Awaited<ReturnType<typeof getDocumentView>>>;
const TABS = [
  ["document", "Document", FileText],
  ["discussions", "Discussions", MessageSquare],
  ["cahier", "Cahier des charges", FileText],
  ["participants", "Participants", Users],
  ["historique", "Historique", Clock],
  ["validation", "Validation", PenLine],
  ["signature", "Signature", PenLine],
] as const;

function statusTone(status: string) {
  if (status === "VALIDATED" || status === "LOCKED") return "bg-[#e7f8ee] text-[#14804a]";
  if (status === "IN_DISCUSSION" || status === "CHANGES_REQUESTED") return "bg-[#fff4e5] text-[#c56a10]";
  return "bg-[#f3f4f6] text-[#6b7280]";
}

function HighlightedText({ text, marks }: { text: string; marks: string[] }) {
  const needle = marks.map((mark) => mark.trim()).find((mark) => mark.length > 2 && text.includes(mark));
  if (!needle) return text;
  const index = text.indexOf(needle);
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-[#fff4c2] px-0.5">{needle}</mark>
      {text.slice(index + needle.length)}
    </>
  );
}

export function DocumentWorkspace({
  view,
  initialTab,
  history,
}: {
  view: View;
  initialTab: string;
  history: { role: string; content: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState(TABS.some((item) => item[0] === initialTab) ? initialTab : "document");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [proposalFor, setProposalFor] = useState<string | null>(null);
  const [proposalText, setProposalText] = useState("");
  const [comment, setComment] = useState<Record<string, string>>({});
  const [versionId, setVersionId] = useState(view.versions[0]?.id ?? "");
  const [activeId, setActiveId] = useState(view.sections.find((section) => section.status === "IN_DISCUSSION")?.id ?? view.sections[0]?.id ?? "");
  const [sectionQuery, setSectionQuery] = useState("");
  const [zoom, setZoom] = useState("100");
  const [more, setMore] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing || !dirty) return;
    const sectionId = editing;
    const timer = setTimeout(() => {
      const latest = draftsRef.current[sectionId];
      if (latest == null) return;
      updateSectionContent(view.id, sectionId, latest, false).then(() => setSaved("Enregistré"));
    }, 900);
    return () => clearTimeout(timer);
  }, [drafts, editing, dirty, view.id]);

  function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error ?? "Action impossible.");
      else {
        setSaved("");
        router.refresh();
      }
    });
  }

  const version = view.versions.find((item) => item.id === versionId) ?? view.versions[0];
  const active = view.sections.find((section) => section.id === activeId) ?? view.sections[0];
  const activeIndex = Math.max(0, view.sections.findIndex((section) => section.id === active?.id));
  const content = active ? (drafts[active.id] ?? active.content) : "";
  const proposals = active ? view.proposals.filter((item) => item.sectionId === active.id && item.status === "PENDING") : [];
  const sectionTalks = active ? view.discussions.filter((item) => item.sectionId === active.id) : [];
  const nextSection = view.sections.find((section) => section.status === "IN_DISCUSSION" || section.status === "CHANGES_REQUESTED") ?? view.sections.find((section) => section.status !== "VALIDATED" && section.status !== "LOCKED");
  const organizations = [...new Set(view.stakeholders.map((party) => party.organization).filter(Boolean))].slice(0, 2);
  const openSections = view.sections.filter((section) => section.status !== "VALIDATED" && section.status !== "LOCKED");
  const filteredSections = view.sections.filter((section) => section.title.toLowerCase().includes(sectionQuery.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f0ff] text-[#2f6fed]">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-[#8b939e]">
              <Link href="/documents" className="hover:text-[#2f6fed]">Mes documents</Link>
              <span> · </span>
              <Link href={`/espaces/${view.workspaceId}`} className="hover:text-[#2f6fed]">{view.workspaceName}</Link>
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#10233f]">{view.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eef3f8] px-2.5 py-1 text-xs text-[#3f4854]">{view.typeLabel}</span>
              <Link href={`/espaces/${view.workspaceId}`} className="rounded-full bg-[#eef3f8] px-2.5 py-1 text-xs text-[#3f4854]">{view.workspaceName}</Link>
              {organizations.map((name) => <span key={name} className="rounded-full bg-[#eef3f8] px-2.5 py-1 text-xs text-[#3f4854]">{name}</span>)}
              <StatusBadge status={view.status} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a className="inline-flex h-10 items-center rounded-full border border-[#e6eef8] bg-white px-3 text-sm text-[#243040]" href={`/api/documents/${view.id}/export?format=pdf`}>Exporter PDF</a>
          <a className="inline-flex h-10 items-center rounded-full border border-[#e6eef8] bg-white px-3 text-sm text-[#243040]" href={`/api/documents/${view.id}/export?format=docx`}>Exporter Word</a>
          <a className="inline-flex h-10 items-center gap-1 rounded-full border border-[#e6eef8] bg-white px-3 text-sm text-[#243040]" href={`/documents/${view.id}/imprimer`} target="_blank"><Printer className="h-4 w-4" />Imprimer</a>
          <div className="relative">
            <button type="button" onClick={() => setMore((value) => !value)} className="inline-flex h-10 items-center gap-1 rounded-full border border-[#e6eef8] bg-white px-3 text-sm text-[#243040]">
              Plus <ChevronDown className="h-4 w-4" />
            </button>
            {more && active ? (
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-2xl border border-[#e6eef8] bg-white p-2 text-sm shadow-lg">
                {view.access.canEdit && active.status !== "LOCKED" ? <button type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[#f4f7fb]" onClick={() => { setEditing(active.id); setDrafts((current) => ({ ...current, [active.id]: active.content })); setMore(false); }}>Modifier la section</button> : null}
                {view.access.canValidate && active.status !== "VALIDATED" ? <button type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[#f4f7fb]" onClick={() => { setMore(false); run(() => setSectionStatus(view.id, active.id, "VALIDATED")); }}>Valider la section</button> : null}
                {view.access.canLock && active.status !== "LOCKED" ? <button type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[#f4f7fb]" onClick={() => { setMore(false); run(() => setSectionStatus(view.id, active.id, "LOCKED")); }}>Verrouiller</button> : null}
                {view.access.canLock && active.status === "LOCKED" ? <button type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[#f4f7fb]" onClick={() => { setMore(false); run(() => setSectionStatus(view.id, active.id, "IN_PREPARATION")); }}>Déverrouiller</button> : null}
                {view.access.canPropose && active.status !== "LOCKED" ? <button type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[#f4f7fb]" onClick={() => { setProposalFor(active.id); setMore(false); }}>Proposer une formulation</button> : null}
                {view.access.isModerator ? <button type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[#f4f7fb]" onClick={() => { setMore(false); run(() => proposeFormulation(view.id, active.id)); }}>Formulation IA</button> : null}
                <button type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[#f4f7fb]" onClick={() => { setTab("participants"); setMore(false); }}>Partager</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section className="grid gap-4 rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
        <div>
          <ProgressBar value={view.progress.percent} />
          <p className="mt-2 text-sm text-[#5e6875]">{view.progress.validated} / {view.progress.total} sections validées · {view.progress.discussion} en discussion · {view.progress.todo} à compléter</p>
          {saved ? <p className="mt-1 text-xs text-[#14804a]">{saved}</p> : null}
        </div>
        {nextSection ? (
          <button type="button" onClick={() => { setTab("document"); setActiveId(nextSection.id); }} className="rounded-2xl border border-[#e6eef8] px-4 py-3 text-left hover:border-[#c9d7fb]">
            <p className="text-xs text-[#8b939e]">Prochaine étape</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-[#10233f]"><Clock className="h-4 w-4 text-[#2f6fed]" />Réviser la section {view.sections.findIndex((section) => section.id === nextSection.id) + 1}</p>
            <p className="text-xs text-[#6b7280]">{nextSection.title}</p>
          </button>
        ) : null}
      </section>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[#e6eef8] bg-white px-2 py-2 shadow-sm">
        {TABS.map(([id, label, Icon]) => {
          const count = id === "discussions" ? view.discussions.length : id === "participants" ? view.stakeholders.length : 0;
          return (
            <button key={id} type="button" onClick={() => setTab(id)} className={cn("inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm whitespace-nowrap", tab === id ? "bg-[#e8f0ff] font-medium text-[#2f6fed]" : "text-[#5e6875] hover:bg-[#f4f7fb]")}>
              <Icon className="h-4 w-4" />
              {label}
              {count > 0 ? <span className="rounded-full bg-white px-1.5 text-xs">{count}</span> : null}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-[#9f2d2d]">{error}</p> : null}

      {tab === "document" && active ? (
        <div className="space-y-4">
          <div className="grid items-start gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
            <section className="rounded-2xl border border-[#e6eef8] bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-sm font-semibold text-[#10233f]">Sections du document</p>
              </div>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b939e]" />
                <input value={sectionQuery} onChange={(event) => setSectionQuery(event.target.value)} placeholder="Rechercher" className="h-9 w-full rounded-xl border border-[#e6eef8] pl-8 pr-3 text-sm outline-none focus:border-[#2f6fed]" />
              </div>
              <div className="space-y-1">
                {filteredSections.map((section) => {
                  const index = view.sections.findIndex((item) => item.id === section.id);
                  const selected = section.id === active.id;
                  return (
                    <button key={section.id} type="button" onClick={() => setActiveId(section.id)} className={cn("flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm", selected ? "bg-[#e8f0ff]" : "hover:bg-[#f4f7fb]")}>
                      <span className="w-5 shrink-0 text-xs text-[#8b939e]">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[#10233f]">{section.title}</span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", statusTone(section.status))}>{sectionStatusLabel(section.status)}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-[#e6eef8] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eef2f7] px-4 py-3">
                <select className="h-9 rounded-lg border border-[#e6eef8] bg-white px-2 text-sm" value={version?.id ?? ""} onChange={(event) => setVersionId(event.target.value)}>
                  <option value={view.versions[0]?.id ?? ""}>Version actuelle</option>
                  {view.versions.slice(1).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <select className="h-9 rounded-lg border border-[#e6eef8] bg-white px-2 text-sm" value={zoom} onChange={(event) => setZoom(event.target.value)} aria-label="Taille du texte">
                  <option value="90">90 %</option>
                  <option value="100">100 %</option>
                  <option value="110">110 %</option>
                  <option value="125">125 %</option>
                </select>
              </div>
              <div className="px-5 py-5" style={{ fontSize: `${zoom}%` }}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-[#10233f]">{activeIndex + 1}. {active.title}</h2>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusTone(active.status))}>{sectionStatusLabel(active.status)}</span>
                </div>
                {version && version.id !== view.versions[0]?.id ? (
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#243040]">
                    {version.sections.find((section) => section.title === active.title)?.content ?? "Cette version ne contient pas cette section."}
                  </div>
                ) : editing === active.id && view.access.canEdit && active.status !== "LOCKED" ? (
                  <textarea id={`editor-${active.id}`} className={`${controlClass} mt-4 min-h-56`} value={content} onChange={(event) => {
                    const value = event.target.value;
                    draftsRef.current = { ...draftsRef.current, [active.id]: value };
                    setDirty(true);
                    setDrafts(draftsRef.current);
                  }} />
                ) : (
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#243040]">
                    <HighlightedText text={content} marks={proposals.map((item) => item.previousText)} />
                  </div>
                )}
                {proposalFor === active.id ? (
                  <div className="mt-4 space-y-2">
                    <textarea className={`${controlClass} min-h-24`} value={proposalText} onChange={(event) => setProposalText(event.target.value)} placeholder="Nouvelle formulation" />
                    <Button type="button" onClick={() => run(async () => {
                      const result = await createProposal(view.id, active.id, content.slice(0, 500), proposalText);
                      if (result.ok) { setProposalFor(null); setProposalText(""); }
                      return result;
                    })}>Envoyer la proposition</Button>
                  </div>
                ) : null}
                {proposals.map((proposal) => (
                  <div key={proposal.id} className="mt-4 rounded-xl border border-[#f3e2b0] bg-[#fff9ea] p-4 text-sm">
                    <p className="font-medium">{proposal.summary}</p>
                    <p className="mt-2 text-[#8b939e]">Ancienne version</p>
                    <p>{proposal.previousText}</p>
                    <p className="mt-2 text-[#8b939e]">Nouvelle version</p>
                    <p>{proposal.proposedText}</p>
                    {view.access.canValidate ? (
                      <div className="mt-3 space-y-2">
                        <textarea className={`${controlClass} min-h-20`} defaultValue={proposal.proposedText} id={`edit-${proposal.id}`} />
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" onClick={() => run(() => resolveProposal(view.id, proposal.id, "ACCEPTED"))}>Accepter</Button>
                          <Button variant="secondary" type="button" onClick={() => run(() => resolveProposal(view.id, proposal.id, "REJECTED"))}>Refuser</Button>
                          <Button variant="secondary" type="button" onClick={() => {
                            const value = (document.getElementById(`edit-${proposal.id}`) as HTMLTextAreaElement | null)?.value ?? proposal.proposedText;
                            run(() => resolveProposal(view.id, proposal.id, "MODIFIED", value));
                          }}>Modifier</Button>
                          <Button variant="ghost" type="button" onClick={() => run(() => resolveProposal(view.id, proposal.id, "DISCUSS"))}>Discuter</Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-[#eef2f7] px-4 py-3">
                {view.access.canEdit && active.status !== "LOCKED" && editing !== active.id ? <Button variant="secondary" type="button" onClick={() => { setEditing(active.id); setDrafts((current) => ({ ...current, [active.id]: active.content })); }}>Modifier</Button> : null}
                {view.access.canEdit && active.status !== "LOCKED" ? (
                  <button type="button" className="inline-flex h-9 items-center rounded-full bg-[#2f6fed] px-4 text-sm font-medium text-white" onClick={() => {
                    const latest = draftsRef.current[active.id] ?? content;
                    run(() => updateSectionContent(view.id, active.id, latest, true));
                  }}>Enregistrer</button>
                ) : null}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-[#d7e6ff] bg-[#f3f8ff] p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#10233f]">Assistant Misterdil</p>
                <p className="mt-1 text-xs leading-5 text-[#3f4854]">{active.status === "IN_DISCUSSION" ? "Cette section est en discussion. Le modérateur décide." : "L'assistant propose. Le modérateur décide."}</p>
                <div className="mt-3 flex flex-col gap-2">
                  <button type="button" className="h-9 rounded-full bg-[#2f6fed] text-sm font-medium text-white" onClick={() => setTab("discussions")}>Résumer les discussions</button>
                  {view.access.isModerator ? <button type="button" className="h-9 rounded-full border border-[#c9d7fb] bg-white text-sm font-medium text-[#2f6fed]" onClick={() => run(() => proposeFormulation(view.id, active.id))}>Proposer une formulation</button> : null}
                </div>
                <div className="mt-3 rounded-xl bg-white p-3 text-[#12151a]">
                  <AssistantPanel documentId={view.id} initial={history} compact />
                </div>
              </section>
              <section className="rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#10233f]">Discussions de la section</h2>
                  <button type="button" className="text-xs text-[#2f6fed]" onClick={() => setTab("discussions")}>Voir tout</button>
                </div>
                <ul className="space-y-3">
                  {sectionTalks.length === 0 ? <li className="text-sm text-[#6b7280]">Aucune discussion sur cette section.</li> : null}
                  {sectionTalks.flatMap((discussion) => discussion.comments).slice(0, 4).map((item) => (
                    <li key={item.id} className="text-sm">
                      <p className="font-medium text-[#10233f]">{item.authorName}</p>
                      <p className="text-xs text-[#8b939e]">{formatRelative(item.createdAt)}</p>
                      <p className="mt-1 leading-5 text-[#3f4854]">{item.body}</p>
                    </li>
                  ))}
                </ul>
                {view.access.canComment ? (
                  <div className="mt-3 flex gap-2">
                    <input className={controlClass} value={comment[active.id] ?? ""} onChange={(event) => setComment((current) => ({ ...current, [active.id]: event.target.value }))} placeholder="Ajouter un commentaire" />
                    <Button type="button" onClick={() => run(() => addComment(view.id, { sectionId: active.id, body: comment[active.id] ?? "" }))}>Envoyer</Button>
                  </div>
                ) : null}
              </section>
            </aside>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#10233f]">Documents liés</p>
              {view.linkedSpec ? <Link href={`/documents/${view.linkedSpec.id}`} className="mt-3 block text-sm text-[#2f6fed]">{view.linkedSpec.title}</Link> : <p className="mt-3 text-sm text-[#6b7280]">Aucun cahier des charges lié.</p>}
              {view.attachments.map((file) => <a key={file.id} className="mt-2 block text-sm text-[#2f6fed]" href={`/api/attachments/${file.id}`}>{file.name}</a>)}
            </article>
            <article className="rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#10233f]"><Video className="h-4 w-4 text-[#2f6fed]" />Réunions associées</p>
              <p className="mt-3 text-sm leading-5 text-[#6b7280]">Les réunions Teams de ce document apparaîtront ici après la connexion Microsoft.</p>
            </article>
            <article className="rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#10233f]"><Mail className="h-4 w-4 text-[#2f6fed]" />Emails associés</p>
              <p className="mt-3 text-sm leading-5 text-[#6b7280]">Les courriels Outlook liés à ce document apparaîtront ici après la connexion Microsoft.</p>
            </article>
            <article className="rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#10233f]">Tâches liées</p>
              <ul className="mt-3 space-y-2">
                {openSections.length === 0 ? <li className="text-sm text-[#6b7280]">Toutes les sections sont validées.</li> : null}
                {openSections.slice(0, 3).map((section) => (
                  <li key={section.id}>
                    <button type="button" onClick={() => setActiveId(section.id)} className="flex w-full items-center justify-between gap-2 text-left text-sm text-[#243040]">
                      <span>Réviser {section.title}</span>
                      {section.status === "IN_DISCUSSION" ? <span className="rounded-full bg-[#fff1f0] px-2 py-0.5 text-[10px] font-medium text-[#c2410c]">Urgent</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      ) : null}

      {tab === "discussions" ? (
        <div className="space-y-4">
          {view.access.canComment ? (
            <Card className="space-y-3 p-5">
              <Field label="Nouvelle discussion">
                <textarea className={`${controlClass} min-h-24`} value={comment.new ?? ""} onChange={(event) => setComment((current) => ({ ...current, new: event.target.value }))} placeholder="Écrire à toutes les parties" />
              </Field>
              <Button type="button" onClick={() => run(() => addComment(view.id, { body: comment.new ?? "" }))}>Publier</Button>
            </Card>
          ) : null}
          {view.discussions.map((discussion) => (
            <Card key={discussion.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{discussion.title}</h2>
                <StatusBadge status={discussion.status === "OPEN" ? "IN_DISCUSSION" : "RESOLVED"} kind="raw" />
              </div>
              <div className="mt-4 space-y-3">
                {discussion.comments.map((item) => (
                  <div key={item.id} className={cn("rounded-lg px-3 py-3 text-sm leading-6", item.isAi ? "bg-[#eef3ff]" : "bg-[#f7f8fb]")}>
                    <p className="font-medium">{item.authorName}</p>
                    <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
                    <p className="mt-1 text-xs text-[#8b939e]">{formatDateTime(item.createdAt)}</p>
                  </div>
                ))}
              </div>
              {view.access.canComment ? (
                <div className="mt-4 flex gap-2">
                  <input className={controlClass} value={comment[discussion.id] ?? ""} onChange={(event) => setComment((current) => ({ ...current, [discussion.id]: event.target.value }))} placeholder="Répondre" />
                  <Button type="button" onClick={() => run(() => addComment(view.id, { discussionId: discussion.id, body: comment[discussion.id] ?? "" }))}>Envoyer</Button>
                  <Button variant="secondary" type="button" onClick={() => run(() => setDiscussionStatus(view.id, discussion.id, discussion.status === "OPEN" ? "RESOLVED" : "OPEN"))}>{discussion.status === "OPEN" ? "Résolu" : "Rouvrir"}</Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "cahier" ? (
        <Card className="p-6">
          {view.linkedSpec ? (
            <>
              <h2 className="text-lg font-semibold">{view.linkedSpec.title}</h2>
              <p className="mt-2 text-sm text-[#5e6875]">Le cahier des charges de cet espace est un document à part, avec ses propres sections et validations.</p>
              <Link href={`/documents/${view.linkedSpec.id}`} className="mt-4 inline-flex text-sm font-medium text-[#1e4ed8]">Ouvrir le cahier des charges</Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Aucun cahier des charges lié</h2>
              <p className="mt-2 text-sm text-[#5e6875]">Créez-en un dans le même espace pour décrire les besoins et les critères d&apos;acceptation.</p>
              <Link href="/documents/nouveau" className="mt-4 inline-flex text-sm font-medium text-[#1e4ed8]">Créer un cahier des charges</Link>
            </>
          )}
          {view.attachments.length ? (
            <ul className="mt-6 space-y-2 text-sm">
              {view.attachments.map((file) => <li key={file.id}><a className="text-[#1e4ed8]" href={`/api/attachments/${file.id}`}>{file.name}</a></li>)}
            </ul>
          ) : null}
        </Card>
      ) : null}

      {tab === "participants" ? (
        <Card className="p-6">
          <p className="text-sm font-medium">Modérateur : {view.moderatorName}</p>
          {view.access.canInvite ? (
            <div className="mt-3 max-w-sm">
              <select className={controlClass} value={view.moderatorId ?? ""} onChange={(event) => run(() => setModerator(view.id, event.target.value))}>
                {view.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </div>
          ) : null}
          <ul className="mt-6 divide-y divide-[#f2f3f6]">
            {view.stakeholders.map((party) => (
              <li key={party.id} className="py-3 text-sm">
                <p className="font-medium">{party.organization || party.name}</p>
                <p className="text-[#5e6875]">{partyLabel(party.partyType)} · {party.representative || party.name} · {party.jobTitle}</p>
                <p className="text-[#8b939e]">{party.email}{party.phone ? ` · ${party.phone}` : ""}</p>
              </li>
            ))}
          </ul>
          {view.access.canInvite ? <InviteForm view={view} onDone={() => router.refresh()} /> : null}
        </Card>
      ) : null}

      {tab === "historique" ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="p-3">
            {view.versions.map((item) => (
              <button key={item.id} type="button" onClick={() => setVersionId(item.id)} className={cn("block w-full rounded-lg px-3 py-3 text-left text-sm", item.id === version?.id ? "bg-[#eef3ff]" : "hover:bg-[#f6f7f9]")}>
                <span className="font-medium">{item.label}</span>
                <span className="mt-1 block text-xs text-[#8b939e]">{item.createdByName} · {formatDateTime(item.createdAt)}</span>
              </button>
            ))}
          </Card>
          <div className="space-y-4">
            <Card className="divide-y divide-[#f2f3f6]">
              {view.activities.map((item) => (
                <div key={item.id} className="px-5 py-3 text-sm">
                  <p>{item.message}</p>
                  <p className="mt-1 text-xs text-[#8b939e]">{formatDateTime(item.createdAt)}</p>
                </div>
              ))}
            </Card>
            {version ? (
              <Card className="p-5">
                <h2 className="font-semibold">{version.label}</h2>
                <div className="mt-4 space-y-4">
                  {version.sections.map((section) => (
                    <div key={section.title}>
                      <p className="text-sm font-medium">{section.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#3f4854]">{section.content}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "validation" ? (
        <div className="space-y-4">
          {view.readyForFinal ? (
            <Card className="p-5">
              <h2 className="text-lg font-semibold">Document prêt pour validation finale</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {view.approvals.length ? view.approvals.map((item) => (
                  <li key={item.id} className="flex items-center justify-between"><span>{item.roleLabel} — {item.name}</span><StatusBadge status={item.status === "APPROVED" ? "VALIDATED" : "NOT_STARTED"} kind="section" /></li>
                )) : <li className="text-[#5e6875]">Les parties n&apos;ont pas encore été sollicitées.</li>}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {view.access.canValidate && view.approvals.length === 0 ? <Button type="button" onClick={() => run(() => requestValidation(view.id))}>Demander la validation</Button> : null}
                {view.approvals.some((item) => item.userId === view.stakeholders.find((party) => party.isCurrentUser)?.userId && item.status !== "APPROVED") ? <Button type="button" onClick={() => run(() => approveParticipation(view.id))}>Valider ma participation</Button> : null}
                {view.access.canValidate && view.partiesApproved ? <Button type="button" onClick={() => run(() => sendForSignature(view.id))}>Envoyer pour signature</Button> : null}
              </div>
            </Card>
          ) : (
            <Card className="p-5 text-sm text-[#5e6875]">Les sections encore ouvertes doivent être validées avant la validation finale.</Card>
          )}
          <Card className="divide-y divide-[#f2f3f6]">
            {view.sections.map((section) => (
              <div key={section.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{section.title}</span>
                <StatusBadge status={section.status} kind="section" />
              </div>
            ))}
          </Card>
        </div>
      ) : null}

      {tab === "signature" ? (
        <div className="space-y-3">
          <Card className="p-5 text-sm leading-6 text-[#5e6875]">Chaque signature est consignée avec l&apos;identité, la date et l&apos;heure. Un fournisseur de signature qualifiée pourra remplacer ce journal interne sans changer le parcours.</Card>
          {view.signatures.length === 0 ? <Card className="p-5 text-sm text-[#5e6875]">Les signatures seront demandées après la validation finale.</Card> : null}
          {view.signatures.map((item) => (
            <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-medium">{item.organization || item.name}</p>
                <p className="text-sm text-[#5e6875]">{partyLabel(item.partyType)}</p>
                {item.signedAt ? <p className="mt-1 text-sm">Signé par {item.signerName} · {formatDateTime(item.signedAt)}</p> : <p className="mt-1 text-sm">Signature requise</p>}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={item.status === "SIGNED" ? "SIGNED" : "REQUIRED"} kind="raw" />
                {item.canSign ? <Button type="button" disabled={pending} onClick={() => run(() => signDocument(view.id, item.id))}>Signer</Button> : null}
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InviteForm({ view, onDone }: { view: View; onDone: () => void }) {
  const [party, setParty] = useState({ name: "", organization: "", partyType: "PARTNER", email: "", phone: "", representative: "", jobTitle: "", address: "", accessRole: "PARTICIPANT" });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <form className="mt-6 grid gap-3 border-t border-[#eef0f3] pt-5 sm:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      startTransition(async () => {
        const result = await saveParties(view.id, [...view.stakeholders.map((item) => ({
          name: item.name,
          organization: item.organization,
          partyType: item.partyType,
          email: item.email,
          phone: item.phone,
          representative: item.representative,
          jobTitle: item.jobTitle,
          address: item.address,
          accessRole: item.accessRole,
        })), party], view.moderatorId ?? "");
        setMessage(result.ok ? "Invitation enregistrée. Le courriel partira lorsque la messagerie sera connectée." : result.error);
        if (result.ok) onDone();
      });
    }}>
      <input className={controlClass} placeholder="Nom" value={party.name} onChange={(event) => setParty({ ...party, name: event.target.value })} required />
      <input className={controlClass} placeholder="Organisation" value={party.organization} onChange={(event) => setParty({ ...party, organization: event.target.value })} />
      <input className={controlClass} placeholder="Courriel" type="email" value={party.email} onChange={(event) => setParty({ ...party, email: event.target.value })} required />
      <Button disabled={pending}>{pending ? "Invitation..." : "Inviter"}</Button>
      {message ? <p className="text-sm text-[#5e6875] sm:col-span-2">{message}</p> : null}
    </form>
  );
}
