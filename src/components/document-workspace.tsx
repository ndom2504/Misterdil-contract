"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronDown, Clock, Copy, FileText, Lock, Mail, MessageSquare, PenLine, Phone, Printer, Search, Send, Sparkles, Users, Video } from "lucide-react";
import { addComment, approveParticipation, createProposal, proposeFormulation, requestValidation, resolveProposal, saveParties, sendForSignature, sendToMembers, setDiscussionStatus, setModerator, signDocument } from "@/server/actions/collaboration";
import { setSectionStatus, updateSectionContent } from "@/server/actions/documents";
import { AgendaPanel } from "@/components/agenda-panel";
import { AssistantPanel } from "@/components/assistant-panel";
import { ColorPicker } from "@/components/color-picker";
import { DeadlineBadge } from "@/components/deadline-badge";
import { EntenteChat } from "@/components/entente-chat";
import { SectionSocialBar, SocialCounts } from "@/components/section-social";
import { PresenceBubbles, type BubblePerson } from "@/components/presence-bubbles";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { AGREEMENT_STEPS, StepTrail } from "@/components/step-trail";
import { Button, Card, Field, controlClass } from "@/components/ui";
import { useDocumentSync } from "@/components/use-document-sync";
import type { PresenceEntry, SyncSection } from "@/lib/document-sync";
import { partyLabel, roleLabel, sectionStatusLabel } from "@/lib/domain";
import { formatDateTime, formatRelative } from "@/lib/format";
import { paletteColor } from "@/lib/palette";
import { progressFromSections } from "@/lib/progress";
import { cn } from "@/lib/cn";
import type { ShareResult } from "@/server/sharing";
import type { getDocumentView } from "@/server/queries";

type View = NonNullable<Awaited<ReturnType<typeof getDocumentView>>>;
type SendOutcome = { shared: ShareResult[]; links: View["invitationLinks"] };
type Conflict = { sectionId: string; message: string; content: string; updatedAt: string };

function buildPeople(view: View, presence: PresenceEntry[]): BubblePerson[] {
  const seen = new Map(presence.map((entry) => [entry.userId, entry]));
  const used = new Set<string>();
  const people: BubblePerson[] = [];

  function registered(userId: string, name: string, organization: string, role: string, avatar = ""): BubblePerson {
    used.add(userId);
    const entry = seen.get(userId);
    const isYou = userId === view.currentUserId;
    const avatarUrl = avatar || entry?.avatarUrl || "";
    if (isYou || entry?.online) {
      const title = entry?.sectionId ? view.sections.find((section) => section.id === entry.sectionId)?.title : undefined;
      return { key: userId, name, organization, role, isYou, avatarUrl, state: "online", detail: title ? `En ligne · modifie « ${title} »` : "En ligne" };
    }
    return {
      key: userId,
      name,
      organization,
      role,
      isYou,
      avatarUrl,
      state: "offline",
      detail: entry ? `Vu ${formatRelative(entry.lastSeenAt)}` : "N'a pas encore ouvert l'entente",
    };
  }

  for (const party of view.stakeholders) {
    const name = party.representative || party.name;
    const role = `${partyLabel(party.partyType)} · ${party.userId && party.userId === view.moderatorId ? "Modérateur" : roleLabel(party.accessRole)}`;
    const organization = party.organization && party.organization !== name ? party.organization : "";
    if (party.userId) {
      if (!used.has(party.userId)) people.push(registered(party.userId, name, organization, role, party.avatarUrl));
      continue;
    }
    people.push({
      key: `party-${party.id}`,
      name,
      organization,
      role,
      isYou: false,
      state: party.invitedAt ? "invited" : "draft",
      detail: party.invitedAt
        ? "Invitation envoyée, en attente d'inscription"
        : !party.email
          ? "Sans courriel : ajoutez-en un pour l'inviter"
          : view.sentAt ? "Pas encore invité" : "Sera invité à l'envoi de l'entente",
    });
  }
  if (view.moderatorId && !used.has(view.moderatorId)) {
    people.push(registered(view.moderatorId, view.moderatorName, "", "Modérateur", view.moderatorAvatar));
  }
  for (const entry of presence) {
    if (entry.online && !used.has(entry.userId)) {
      people.push(registered(entry.userId, entry.name, entry.organization, "Membre de l'espace"));
    }
  }
  return people;
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-[#e6eef8] bg-white px-3 text-xs font-medium text-[#2f6fed] hover:border-[#c9d7fb]"
      onClick={() => {
        void navigator.clipboard?.writeText(link).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copié" : "Copier le lien"}
    </button>
  );
}

function SendResults({ outcome, onClose }: { outcome: SendOutcome; onClose: () => void }) {
  const byEmail = new Map(outcome.links.map((item) => [item.email, item]));
  return (
    <section className="rounded-2xl border border-[#cdebd9] bg-[#f2fbf6] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#10233f]">Entente envoyée</p>
          <p className="mt-1 text-xs text-[#3f4854]">Les membres inscrits y ont accès dès maintenant. Les autres doivent créer leur compte depuis leur invitation.</p>
        </div>
        <button type="button" className="text-xs text-[#5e6875] hover:text-[#10233f]" onClick={onClose}>Fermer</button>
      </div>
      {outcome.shared.length === 0 ? <p className="mt-3 text-sm text-[#5e6875]">Tous les membres avaient déjà été invités.</p> : null}
      <ul className="mt-3 space-y-2">
        {outcome.shared.map((item) => {
          const link = item.link || byEmail.get(item.email)?.link || "";
          return (
            <li key={`${item.email}-${item.name}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="font-medium text-[#10233f]">{item.name}</span>
                <span className="block text-xs text-[#5e6875]">
                  {item.status === "notified"
                    ? "Compte Misterdil : accès ouvert et notification envoyée"
                    : item.status === "emailed"
                      ? `Invitation envoyée par Outlook à ${item.email}`
                      : `Courriel non envoyé : partagez le lien avec ${item.email}`}
                </span>
              </span>
              {item.status !== "notified" && link ? <CopyLink link={link} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
const TABS = [
  ["document", "Document", FileText],
  ["discussion", "Chat et appel", Phone],
  ["agenda", "Agenda", CalendarDays],
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
  initialSection,
  callInvite = false,
  history,
}: {
  view: View;
  initialTab: string;
  initialSection?: string;
  callInvite?: boolean;
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
  const [activeId, setActiveId] = useState(
    (initialSection && view.sections.some((section) => section.id === initialSection) ? initialSection : undefined) ??
      view.sections.find((section) => section.status === "IN_DISCUSSION")?.id ??
      view.sections[0]?.id ??
      "",
  );
  const [sectionQuery, setSectionQuery] = useState("");
  const [zoom, setZoom] = useState("100");
  const [more, setMore] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sending, startSending] = useTransition();
  const [live, setLive] = useState<Record<string, SyncSection>>({});
  const [bases, setBases] = useState<Record<string, string>>({});
  const basesRef = useRef(bases);
  basesRef.current = bases;
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [outcome, setOutcome] = useState<SendOutcome | null>(null);

  const sections = view.sections.map((section) => {
    const fresh = live[section.id];
    return fresh && fresh.updatedAt >= section.updatedAt
      ? { ...section, ...fresh, updatedByName: fresh.updatedByName || section.updatedByName }
      : section;
  });

  const presence = useDocumentSync({
    documentId: view.id,
    loadedAt: view.loadedAt,
    editing,
    onSections: (changed) => {
      setLive((current) => {
        const next = { ...current };
        for (const section of changed) {
          if (!next[section.id] || next[section.id].updatedAt <= section.updatedAt) next[section.id] = section;
        }
        return next;
      });
    },
  });
  const people = buildPeople(view, presence);

  function remember(sectionId: string, content: string, updatedAt: string) {
    setBases((current) => ({ ...current, [sectionId]: updatedAt }));
    setLive((current) => {
      const section = sections.find((item) => item.id === sectionId);
      if (!section) return current;
      return {
        ...current,
        [sectionId]: {
          id: sectionId,
          content,
          status: section.status === "NOT_STARTED" && content.trim() ? "IN_PREPARATION" : section.status,
          updatedAt,
          updatedById: view.currentUserId,
          updatedByName: "",
        },
      };
    });
  }

  const rememberRef = useRef(remember);
  rememberRef.current = remember;

  function startEditing(sectionId: string) {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return;
    setEditing(sectionId);
    setDirty(false);
    setConflict(null);
    setDrafts((current) => ({ ...current, [sectionId]: section.content }));
    setBases((current) => ({ ...current, [sectionId]: section.updatedAt }));
  }

  useEffect(() => {
    if (!editing || !dirty) return;
    const sectionId = editing;
    const timer = setTimeout(() => {
      const latest = draftsRef.current[sectionId];
      if (latest == null) return;
      updateSectionContent(view.id, sectionId, latest, false, basesRef.current[sectionId]).then((result) => {
        if (result.ok) {
          setDirty(false);
          setSaved("Enregistré");
          if (result.updatedAt) rememberRef.current(sectionId, latest, result.updatedAt);
        } else if ("conflict" in result && result.conflict) {
          setConflict({ sectionId, message: result.error, content: result.content, updatedAt: result.updatedAt });
        } else {
          setError(result.error ?? "Enregistrement impossible.");
        }
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [drafts, editing, dirty, view.id]);

  function saveNow(sectionId: string) {
    const latest = draftsRef.current[sectionId] ?? sections.find((item) => item.id === sectionId)?.content ?? "";
    setError("");
    startTransition(async () => {
      const result = await updateSectionContent(view.id, sectionId, latest, true, basesRef.current[sectionId]);
      if (result.ok) {
        if (result.updatedAt) remember(sectionId, latest, result.updatedAt);
        setEditing(null);
        setDirty(false);
        setConflict(null);
        setSaved("Enregistré");
        router.refresh();
      } else if ("conflict" in result && result.conflict) {
        setConflict({ sectionId, message: result.error, content: result.content, updatedAt: result.updatedAt });
      } else {
        setError(result.error ?? "Enregistrement impossible.");
      }
    });
  }

  function insertIntoSection(sectionId: string, text: string) {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return;
    const base = editing === sectionId ? draftsRef.current[sectionId] ?? section.content : section.content;
    if (editing !== sectionId) {
      setEditing(sectionId);
      setConflict(null);
      setBases((current) => ({ ...current, [sectionId]: section.updatedAt }));
    }
    const next = base.trimEnd() ? `${base.trimEnd()}\n\n${text.trim()}` : text.trim();
    draftsRef.current = { ...draftsRef.current, [sectionId]: next };
    setDrafts(draftsRef.current);
    setDirty(true);
  }

  function send() {
    setError("");
    startSending(async () => {
      const result = await sendToMembers(view.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOutcome({ shared: result.shared, links: result.links });
      router.refresh();
    });
  }

  function removeDocument() {
    if (!window.confirm(`Supprimer définitivement « ${view.title} » ?\n\nToutes les sections, la discussion et les fichiers seront effacés pour toutes les parties. Cette action est irréversible.`)) return;
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/documents/${view.id}`, { method: "DELETE" }).catch(() => null);
      if (!response?.ok) {
        const data = (await response?.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "L'entente n'a pas pu être supprimée.");
        return;
      }
      router.push("/documents");
      router.refresh();
    });
  }

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
  const active = sections.find((section) => section.id === activeId) ?? sections[0];
  const activeIndex = Math.max(0, sections.findIndex((section) => section.id === active?.id));
  const isEditingActive = Boolean(active && editing === active.id);
  const content = active ? (isEditingActive ? drafts[active.id] ?? active.content : active.content) : "";
  const proposals = active ? view.proposals.filter((item) => item.sectionId === active.id && item.status === "PENDING") : [];
  const sectionTalks = active ? view.discussions.filter((item) => item.sectionId === active.id) : [];
  const nextSection = sections.find((section) => section.status === "IN_DISCUSSION" || section.status === "CHANGES_REQUESTED") ?? sections.find((section) => section.status !== "VALIDATED" && section.status !== "LOCKED");
  const organizations = [...new Set(view.stakeholders.map((party) => party.organization).filter(Boolean))].slice(0, 2);
  const openSections = sections.filter((section) => section.status !== "VALIDATED" && section.status !== "LOCKED");
  const filteredSections = sections.filter((section) => section.title.toLowerCase().includes(sectionQuery.trim().toLowerCase()));
  const progress = progressFromSections(sections);
  const canWriteActive = Boolean(active && view.access.canWrite && active.status !== "LOCKED");
  const lockedBy = active
    ? presence.find((entry) => entry.online && entry.userId !== view.currentUserId && entry.sectionId === active.id)
    : undefined;
  const remoteChange =
    active && isEditingActive && active.updatedById && active.updatedById !== view.currentUserId && bases[active.id] && active.updatedAt > bases[active.id]
      ? active
      : null;
  const recipients = view.stakeholders.filter((party) => !party.isCurrentUser && party.userId !== view.currentUserId);
  const reachable = recipients.filter((party) => party.userId || party.email);
  const setupStep = sections.some((section) => section.anchor !== "parties" && section.content.trim()) ? 3 : 2;
  const documentTint = paletteColor(view.color);
  const activeTint = paletteColor(active?.color);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f0ff] text-[#2f6fed]"
            style={documentTint ? { backgroundColor: documentTint.soft, color: documentTint.hex } : undefined}
          >
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
              {view.dueDate ? (
                <button type="button" onClick={() => setTab("agenda")} aria-label="Voir l'agenda de l'entente">
                  <DeadlineBadge dueDate={view.dueDate} status={view.status} withDate className="py-1" />
                </button>
              ) : null}
              {view.access.canWrite ? (
                <ColorPicker
                  endpoint={`/api/documents/${view.id}/color`}
                  value={view.color}
                  label="Réglages de l'entente"
                  compact
                  actions={view.access.isModerator ? [{ label: "Supprimer l'entente", hint: "Sections, discussion et fichiers seront effacés", destructive: true, onSelect: removeDocument }] : []}
                  note={view.access.isModerator ? undefined : "Seul un modérateur peut supprimer cette entente."}
                />
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PresenceBubbles people={people} max={5} className="mr-1" />
          <a className="inline-flex h-10 items-center rounded-full border border-[#e6eef8] bg-white px-3 text-sm text-[#243040]" href={`/api/documents/${view.id}/export?format=pdf`}>Exporter PDF</a>
          <a className="inline-flex h-10 items-center rounded-full border border-[#e6eef8] bg-white px-3 text-sm text-[#243040]" href={`/api/documents/${view.id}/export?format=docx`}>Exporter Word</a>
          <a className="inline-flex h-10 items-center gap-1 rounded-full border border-[#e6eef8] bg-white px-3 text-sm text-[#243040]" href={`/documents/${view.id}/imprimer`} target="_blank"><Printer className="h-4 w-4" />Imprimer</a>
          <div className="relative">
            <button type="button" onClick={() => setMore((value) => !value)} className="inline-flex h-10 items-center gap-1 rounded-full border border-[#e6eef8] bg-white px-3 text-sm text-[#243040]">
              Plus <ChevronDown className="h-4 w-4" />
            </button>
            {more && active ? (
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-2xl border border-[#e6eef8] bg-white p-2 text-sm shadow-lg">
                {canWriteActive && !lockedBy && !isEditingActive ? <button type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[#f4f7fb]" onClick={() => { startEditing(active.id); setMore(false); }}>Modifier la section</button> : null}
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

      {!view.sentAt && view.access.canInvite ? (
        <section className="space-y-4 rounded-2xl border border-[#d7e6ff] bg-[#f3f8ff] p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-[#10233f]">Préparez l&apos;entente, puis envoyez-la aux membres</p>
            <p className="mt-1 text-sm leading-6 text-[#3f4854]">Les sections sont vides et modifiables. Rédigez-les vous-même ou laissez l&apos;assistant proposer un premier jet. Les autres parties n&apos;y ont pas accès avant l&apos;envoi.</p>
          </div>
          <StepTrail steps={AGREEMENT_STEPS} current={setupStep} />
          {recipients.length && !reachable.length ? (
            <p className="text-sm text-[#9f2d2d]">Ajoutez le courriel d&apos;au moins une autre partie pour pouvoir envoyer l&apos;entente.</p>
          ) : null}
          {recipients.length ? (
            <ul className="flex flex-wrap gap-2">
              {recipients.map((party) => (
                <li key={party.id} className="flex items-center gap-2 rounded-full border border-[#e6eef8] bg-white px-3 py-1.5 text-xs">
                  <span className="font-medium text-[#10233f]">{party.representative || party.name}</span>
                  <span className={party.userId ? "text-[#14804a]" : party.email ? "text-[#c56a10]" : "text-[#9f2d2d]"}>
                    {party.userId ? "Compte Misterdil" : party.email ? "Sera invité à s'inscrire" : "Sans courriel"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#9f2d2d]">Ajoutez au moins une autre partie dans l&apos;onglet Participants.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link href={`/documents/nouveau?brouillon=${view.id}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#c9d7fb] bg-white px-4 text-sm font-medium text-[#2f6fed]">
              <Sparkles className="h-4 w-4" />Pré-remplir avec l&apos;assistant
            </Link>
            <button type="button" onClick={() => setTab("participants")} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e6eef8] bg-white px-4 text-sm text-[#243040]">
              <Users className="h-4 w-4" />Modifier l&apos;équipe
            </button>
            <button type="button" disabled={sending || reachable.length === 0} onClick={send} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#2f6fed] px-4 text-sm font-medium text-white disabled:opacity-60">
              <Send className="h-4 w-4" />{sending ? "Envoi..." : "Envoyer aux membres"}
            </button>
          </div>
        </section>
      ) : null}
      {outcome ? <SendResults outcome={outcome} onClose={() => setOutcome(null)} /> : null}

      <section className="grid gap-4 rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
        <div>
          <ProgressBar value={progress.percent} />
          <p className="mt-2 text-sm text-[#5e6875]">{progress.validated} / {progress.total} sections validées · {progress.discussion} en discussion · {progress.todo} à compléter</p>
          {saved ? <p className="mt-1 text-xs text-[#14804a]">{saved}</p> : null}
        </div>
        {nextSection ? (
          <button type="button" onClick={() => { setTab("document"); setActiveId(nextSection.id); }} className="rounded-2xl border border-[#e6eef8] px-4 py-3 text-left hover:border-[#c9d7fb]">
            <p className="text-xs text-[#8b939e]">Prochaine étape</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-[#10233f]"><Clock className="h-4 w-4 text-[#2f6fed]" />Réviser la section {sections.findIndex((section) => section.id === nextSection.id) + 1}</p>
            <p className="text-xs text-[#6b7280]">{nextSection.title}</p>
          </button>
        ) : null}
      </section>

      <div className="flex gap-1 overflow-x-auto scrollbar-none rounded-2xl border border-[#e6eef8] bg-white px-2 py-2 shadow-sm">
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
                  const index = sections.findIndex((item) => item.id === section.id);
                  const selected = section.id === active.id;
                  const writer = presence.find((entry) => entry.online && entry.userId !== view.currentUserId && entry.sectionId === section.id);
                  const tint = paletteColor(section.color);
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveId(section.id)}
                      className={cn("relative flex w-full items-center gap-2 overflow-hidden rounded-xl py-2 pl-3 pr-2 text-left text-sm", selected ? "bg-[#e8f0ff]" : "hover:bg-[#f4f7fb]")}
                      style={selected && tint ? { backgroundColor: tint.soft } : undefined}
                    >
                      <span className="absolute inset-y-1.5 left-0 w-1 rounded-full" style={{ backgroundColor: tint?.hex ?? "transparent" }} />
                      <span className="w-5 shrink-0 text-xs font-semibold" style={{ color: tint?.hex ?? "#8b939e" }}>{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[#10233f]">{section.title}</span>
                      {writer ? <span title={`${writer.name} modifie cette section`}><PenLine className="h-3.5 w-3.5 shrink-0 animate-pulse text-[#0f9d78]" /></span> : null}
                      <SocialCounts social={section.social} />
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", statusTone(section.status))}>{sectionStatusLabel(section.status)}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#e6eef8] bg-white shadow-sm">
              {activeTint ? <div className="h-1.5" style={{ backgroundColor: activeTint.hex }} /> : null}
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
                  {active.updatedByName && active.updatedAt ? (
                    <span className="text-xs text-[#8b939e]">Modifié par {active.updatedByName} {formatRelative(active.updatedAt)}</span>
                  ) : null}
                  {view.access.canWrite ? (
                    <span className="ml-auto">
                      <ColorPicker
                        key={active.id}
                        endpoint={`/api/documents/${view.id}/sections/${active.id}/color`}
                        value={active.color}
                        label="Couleur de la section"
                      />
                    </span>
                  ) : null}
                </div>
                {lockedBy ? (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#ecfdf5] px-3 py-2 text-xs text-[#0f766e]">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    {lockedBy.name} modifie cette section. Le texte se met à jour en direct.
                  </p>
                ) : null}
                {conflict && conflict.sectionId === active.id ? (
                  <div className="mt-3 rounded-xl border border-[#f3d2a6] bg-[#fff7ed] px-3 py-3 text-sm text-[#7c3d0b]">
                    <p>{conflict.message} Votre texte n&apos;a pas été enregistré.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button variant="secondary" type="button" onClick={() => {
                        draftsRef.current = { ...draftsRef.current, [active.id]: conflict.content };
                        setDrafts(draftsRef.current);
                        setBases((current) => ({ ...current, [active.id]: conflict.updatedAt }));
                        setDirty(false);
                        setConflict(null);
                      }}>Reprendre leur version</Button>
                      <Button variant="ghost" type="button" onClick={() => {
                        setBases((current) => ({ ...current, [active.id]: conflict.updatedAt }));
                        setConflict(null);
                        setDirty(true);
                      }}>Garder mon texte</Button>
                    </div>
                  </div>
                ) : remoteChange ? (
                  <p className="mt-3 rounded-xl bg-[#fff7ed] px-3 py-2 text-xs text-[#7c3d0b]">
                    {remoteChange.updatedByName || "Un participant"} vient de modifier cette section pendant que vous écriviez.
                  </p>
                ) : null}
                {version && version.id !== view.versions[0]?.id ? (
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#243040]">
                    {version.sections.find((section) => section.title === active.title)?.content ?? "Cette version ne contient pas cette section."}
                  </div>
                ) : isEditingActive && canWriteActive ? (
                  <textarea id={`editor-${active.id}`} className={`${controlClass} mt-4 min-h-56`} value={content} autoFocus onChange={(event) => {
                    const value = event.target.value;
                    draftsRef.current = { ...draftsRef.current, [active.id]: value };
                    setDirty(true);
                    setDrafts(draftsRef.current);
                  }} />
                ) : content.trim() ? (
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#243040]">
                    <HighlightedText text={content} marks={proposals.map((item) => item.previousText)} />
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!canWriteActive || Boolean(lockedBy)}
                    onClick={() => startEditing(active.id)}
                    className="mt-4 w-full rounded-xl border border-dashed border-[#d6dde8] px-4 py-8 text-center text-sm text-[#8b939e] enabled:hover:border-[#9db8f5] enabled:hover:text-[#2f6fed]"
                  >
                    {canWriteActive ? "Section vide. Cliquez pour commencer la rédaction." : "Cette section n'est pas encore rédigée."}
                  </button>
                )}
                <SectionSocialBar
                  key={active.id}
                  documentId={view.id}
                  sectionId={active.id}
                  social={active.social}
                  onComment={() => {
                    const input = document.getElementById(`comment-${active.id}`);
                    input?.scrollIntoView({ behavior: "smooth", block: "center" });
                    input?.focus();
                  }}
                />
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
                {canWriteActive && !isEditingActive ? (
                  <Button variant="secondary" type="button" disabled={Boolean(lockedBy)} onClick={() => startEditing(active.id)}>Modifier</Button>
                ) : null}
                {canWriteActive && isEditingActive ? (
                  <>
                    <Button variant="ghost" type="button" disabled={pending} onClick={() => {
                      if (dirty) saveNow(active.id);
                      else { setEditing(null); setConflict(null); }
                    }}>Fermer</Button>
                    <button type="button" disabled={pending} className="inline-flex h-9 items-center rounded-full bg-[#2f6fed] px-4 text-sm font-medium text-white disabled:opacity-60" onClick={() => saveNow(active.id)}>Enregistrer</button>
                  </>
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
                  <AssistantPanel
                    documentId={view.id}
                    initial={history}
                    compact
                    sectionId={active.id}
                    sectionTitle={active.title}
                    onInsert={canWriteActive && !lockedBy ? (text) => insertIntoSection(active.id, text) : undefined}
                  />
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
                    <input id={`comment-${active.id}`} className={controlClass} value={comment[active.id] ?? ""} onChange={(event) => setComment((current) => ({ ...current, [active.id]: event.target.value }))} placeholder="Ajouter un commentaire" />
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

      {tab === "discussion" ? <EntenteChat documentId={view.id} currentUserId={view.currentUserId} callInvite={callInvite} /> : null}

      {tab === "agenda" ? <AgendaPanel documentId={view.id} /> : null}

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
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0f3] pb-5">
            <PresenceBubbles people={people} max={10} />
            {!view.sentAt && view.access.canInvite ? (
              <button type="button" disabled={sending || reachable.length === 0} onClick={send} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#2f6fed] px-4 text-sm font-medium text-white disabled:opacity-60">
                <Send className="h-4 w-4" />{sending ? "Envoi..." : "Envoyer aux membres"}
              </button>
            ) : null}
          </div>
          <p className="text-sm font-medium">Modérateur : {view.moderatorName}</p>
          {view.access.canInvite ? (
            <div className="mt-3 max-w-sm">
              <select className={controlClass} value={view.moderatorId ?? ""} onChange={(event) => run(() => setModerator(view.id, event.target.value))}>
                {view.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </div>
          ) : null}
          <ul className="mt-6 divide-y divide-[#f2f3f6]">
            {view.stakeholders.map((party) => {
              const person = people.find((item) => item.key === (party.userId ?? `party-${party.id}`));
              const link = !party.userId ? view.invitationLinks.find((item) => item.email === party.email.toLowerCase()) : undefined;
              return (
                <li key={party.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{party.organization || party.name}</p>
                    <p className="text-[#5e6875]">{[partyLabel(party.partyType), party.representative || party.name, party.jobTitle].filter(Boolean).join(" · ")}</p>
                    <p className="text-[#8b939e]">{party.email}{party.phone ? ` · ${party.phone}` : ""}</p>
                    {person ? (
                      <p className={cn(
                        "mt-1 text-xs",
                        person.state === "online" ? "text-[#14804a]" : person.state === "offline" ? "text-[#5e6875]" : "text-[#c56a10]",
                      )}>
                        {person.detail}
                        {link ? (link.emailed ? " · courriel envoyé" : " · courriel non envoyé") : ""}
                      </p>
                    ) : null}
                  </div>
                  {link ? <CopyLink link={link.link} /> : null}
                </li>
              );
            })}
          </ul>
          {view.access.canInvite ? (
            <InviteForm
              view={view}
              onDone={(shared) => {
                if (shared.length) setOutcome({ shared, links: [] });
                router.refresh();
              }}
            />
          ) : null}
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

function InviteForm({ view, onDone }: { view: View; onDone: (shared: ShareResult[]) => void }) {
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
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        setMessage(view.sentAt ? "Partie ajoutée et invitée." : "Partie ajoutée. Elle recevra l'entente à l'envoi.");
        setParty((current) => ({ ...current, name: "", organization: "", email: "" }));
        onDone(result.shared);
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
