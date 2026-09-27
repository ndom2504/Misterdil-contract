"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComment, approveParticipation, createProposal, proposeFormulation, requestValidation, resolveProposal, saveParties, sendForSignature, setDiscussionStatus, setModerator, signDocument } from "@/server/actions/collaboration";
import { setSectionStatus, updateSectionContent } from "@/server/actions/documents";
import { AssistantPanel } from "@/components/assistant-panel";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button, Card, Field, controlClass } from "@/components/ui";
import { partyLabel } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { getDocumentView } from "@/server/queries";

type View = NonNullable<Awaited<ReturnType<typeof getDocumentView>>>;
const TABS = [
  ["document", "Document"],
  ["discussions", "Discussions"],
  ["cahier", "Cahier des charges"],
  ["participants", "Participants"],
  ["historique", "Historique"],
  ["validation", "Validation"],
  ["signature", "Signature"],
] as const;

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

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#5e6875]"><Link href={`/espaces/${view.workspaceId}`} className="hover:text-[#1e4ed8]">{view.workspaceName}</Link> · {view.typeLabel}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{view.title}</h1>
          <p className="mt-2 text-sm font-medium">Modérateur : {view.moderatorName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="rounded-lg border border-[#e6e8ee] bg-white px-3 py-2 text-sm" href={`/api/documents/${view.id}/export?format=pdf`}>Exporter PDF</a>
          <a className="rounded-lg border border-[#e6e8ee] bg-white px-3 py-2 text-sm" href={`/api/documents/${view.id}/export?format=docx`}>Exporter Word</a>
          <a className="rounded-lg border border-[#e6e8ee] bg-white px-3 py-2 text-sm" href={`/documents/${view.id}/imprimer`} target="_blank">Imprimer</a>
        </div>
      </div>

      <Card className="mb-4 grid gap-4 p-4 md:grid-cols-[1fr_220px] md:items-center">
        <div>
          <ProgressBar value={view.progress.percent} />
          <p className="mt-2 text-sm text-[#5e6875]">{view.progress.validated} / {view.progress.total} sections validées · {view.progress.discussion} en discussion · {view.progress.todo} à compléter</p>
        </div>
        <div className="flex items-center justify-between gap-3 md:justify-end">
          <StatusBadge status={view.status} />
          {saved ? <span className="text-xs text-[#5e6875]">{saved}</span> : null}
        </div>
      </Card>

      <div className="mb-4 flex gap-1 overflow-x-auto">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn("rounded-lg px-3 py-2 text-sm whitespace-nowrap", tab === id ? "bg-white font-medium text-[#1e4ed8] shadow-sm" : "text-[#5e6875] hover:bg-white")}>{label}</button>
        ))}
      </div>
      {error ? <p className="mb-3 text-sm text-[#9f2d2d]">{error}</p> : null}

      {tab === "document" ? (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
          <Card className="h-fit p-3">
            <p className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-[#8b939e]">Sommaire</p>
            {view.sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#f6f7f9]">
                <span>{index + 1}. {section.title}</span>
                <StatusBadge status={section.status} kind="section" />
              </a>
            ))}
          </Card>
          <div className="space-y-4">
            {view.sections.map((section, index) => {
              const content = drafts[section.id] ?? section.content;
              const proposals = view.proposals.filter((item) => item.sectionId === section.id && item.status === "PENDING");
              return (
                <Card key={section.id} id={section.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{index + 1}. {section.title}</h2>
                    <StatusBadge status={section.status} kind="section" />
                  </div>
                  {editing === section.id && view.access.canEdit && section.status !== "LOCKED" ? (
                    <textarea className={`${controlClass} mt-4 min-h-40`} value={content} onChange={(event) => {
                      const value = event.target.value;
                      draftsRef.current = { ...draftsRef.current, [section.id]: value };
                      setDirty(true);
                      setDrafts(draftsRef.current);
                    }} onBlur={() => {
                      const latest = draftsRef.current[section.id] ?? content;
                      run(() => updateSectionContent(view.id, section.id, latest, true));
                    }} />
                  ) : (
                    <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#243040]">{content}</div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {view.access.canEdit && section.status !== "LOCKED" ? <Button variant="secondary" type="button" onClick={() => { setEditing(editing === section.id ? null : section.id); setDrafts((current) => ({ ...current, [section.id]: section.content })); }}>{editing === section.id ? "Fermer" : "Modifier"}</Button> : null}
                    {view.access.canValidate && section.status !== "VALIDATED" ? <Button variant="secondary" type="button" onClick={() => run(() => setSectionStatus(view.id, section.id, "VALIDATED"))}>Valider</Button> : null}
                    {view.access.canLock && section.status !== "LOCKED" ? <Button variant="ghost" type="button" onClick={() => run(() => setSectionStatus(view.id, section.id, "LOCKED"))}>Verrouiller</Button> : null}
                    {view.access.canLock && section.status === "LOCKED" ? <Button variant="ghost" type="button" onClick={() => run(() => setSectionStatus(view.id, section.id, "IN_PREPARATION"))}>Déverrouiller</Button> : null}
                    {view.access.canPropose && section.status !== "LOCKED" ? <Button variant="ghost" type="button" onClick={() => setProposalFor(section.id)}>Proposer</Button> : null}
                    {view.access.canComment ? <Button variant="ghost" type="button" onClick={() => setTab("discussions")}>Discuter</Button> : null}
                    {view.access.isModerator ? <Button variant="ghost" type="button" onClick={() => run(() => proposeFormulation(view.id, section.id))}>Formulation IA</Button> : null}
                  </div>
                  {proposalFor === section.id ? (
                    <div className="mt-4 space-y-2">
                      <textarea className={`${controlClass} min-h-24`} value={proposalText} onChange={(event) => setProposalText(event.target.value)} placeholder="Nouvelle formulation" />
                      <Button type="button" onClick={() => run(async () => {
                        const result = await createProposal(view.id, section.id, content.slice(0, 500), proposalText);
                        if (result.ok) { setProposalFor(null); setProposalText(""); }
                        return result;
                      })}>Envoyer la proposition</Button>
                    </div>
                  ) : null}
                  {proposals.map((proposal) => (
                    <div key={proposal.id} className="mt-4 rounded-lg border border-[#e6e8ee] bg-[#fafbfc] p-4 text-sm">
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
                </Card>
              );
            })}
          </div>
          <Card className="h-fit p-4">
            <p className="mb-3 text-sm font-semibold">Assistant Misterdil</p>
            <AssistantPanel documentId={view.id} initial={history} compact />
          </Card>
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
