"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  FileSignature,
  FileText,
  Handshake,
  Lock,
  Package,
  PenLine,
  Plus,
  ScrollText,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  ClipboardList,
} from "lucide-react";
import { analyzeProject, moreDomains } from "@/server/actions/assistant";
import { searchPeople, type PersonMatch } from "@/server/actions/people";
import { confirmBrief, createAgreement, generateDocument, loadFields, saveContext, saveDescription, saveResponse, saveResponses, saveTitle } from "@/server/actions/documents";
import { createWorkspace } from "@/server/actions/workspaces";
import { PARTY_TYPES } from "@/lib/domain";
import { AGREEMENT_STEPS, StepTrail } from "@/components/step-trail";
import { Button, Card, Field, controlClass } from "@/components/ui";
import { cn } from "@/lib/cn";

const ICONS = {
  contrat: FileText,
  "cahier-des-charges": ClipboardList,
  charte: ScrollText,
  convention: Handshake,
  protocole: FileSignature,
  partenariat: Building2,
  maintenance: Wrench,
  "sous-traitance": Users,
  fourniture: Package,
  confidentialite: Lock,
  personnalise: PenLine,
} as const;

const ASSISTANT_STEPS = ["Contexte", "Projet", "Informations"];
const TEAM_STORAGE = "misterdil:nouvelle-entente";

type WorkspaceOption = { id: string; name: string };
type TypeOption = { id: string; label: string; description: string };
type SectorOption = { id: string; label: string; domains: string[] };
type FieldOption = { key: string; label: string; help: string; fieldType: string; required: boolean; group: string; options: string[] };
type Party = {
  name: string;
  organization: string;
  partyType: string;
  email: string;
  phone: string;
  representative: string;
  jobTitle: string;
  address: string;
  accessRole: string;
};
type Brief = { objectif: string; client: string; prestataire: string; duree: string };
type Draft = {
  id: string;
  title: string;
  typeId: string;
  typeLabel: string;
  sector: string;
  domain: string;
  description: string;
  brief: Brief | null;
  responses: Record<string, string>;
  hasContent: boolean;
};
type WizardUser = {
  id: string;
  name: string;
  email: string;
  organization: string;
  jobTitle: string;
  phone: string;
  address: string;
  individual: boolean;
};

const emptyParty = (): Party => ({
  name: "",
  organization: "",
  partyType: "PROVIDER",
  email: "",
  phone: "",
  representative: "",
  jobTitle: "",
  address: "",
  accessRole: "PARTICIPANT",
});

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function PartySearch({ added, onAdd }: { added: string[]; onAdd: (person: PersonMatch) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonMatch[] | null>(null);
  const [searching, setSearching] = useState(false);

  function search() {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchPeople(text)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#1e4ed8]"><UserPlus className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="font-semibold">Ajouter un utilisateur inscrit</p>
          <p className="mt-0.5 text-sm text-[#5e6875]">Ses coordonnées se remplissent seules. Il aura accès à l&apos;entente dès l&apos;envoi.</p>
        </div>
      </div>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b939e]" />
          <input
            className={`${controlClass} pl-9`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom, organisation ou courriel exact"
            aria-label="Rechercher un utilisateur inscrit"
          />
        </div>
        <Button type="submit" disabled={searching || query.trim().length < 2}>
          <Search className="h-4 w-4" />
          {searching ? "Recherche..." : "Rechercher"}
        </Button>
      </form>
      {results ? (
        results.length ? (
          <ul className="mt-3 divide-y divide-[#eef0f4] rounded-xl border border-[#e6e8ee]">
            {results.map((person) => {
              const already = added.includes(person.email);
              return (
                <li key={person.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e4ed8] text-xs font-semibold text-white">
                    {initials(person.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    <p className="truncate text-xs text-[#5e6875]">{[person.organization, person.email].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Button type="button" variant={already ? "ghost" : "secondary"} disabled={already} onClick={() => onAdd(person)} className="h-8 shrink-0 px-2.5 text-xs">
                    {already ? <><Check className="h-3.5 w-3.5" />Ajouté</> : <><Plus className="h-3.5 w-3.5" />Ajouter</>}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[#5e6875]">
            Aucun utilisateur trouvé dans votre réseau. Saisissez son courriel exact, ou ajoutez la partie à la main ci-dessous.
          </p>
        )
      ) : null}
    </Card>
  );
}

export function AgreementWizard({
  workspaces,
  types,
  sectors,
  user,
  draft,
}: {
  workspaces: WorkspaceOption[];
  types: TypeOption[];
  sectors: SectorOption[];
  user: WizardUser;
  draft: Draft | null;
}) {
  if (draft) return <AssistantPrefill draft={draft} sectors={sectors} />;
  return <NewAgreement workspaces={workspaces} types={types} user={user} />;
}

function NewAgreement({ workspaces, types, user }: { workspaces: WorkspaceOption[]; types: TypeOption[]; user: WizardUser }) {
  const router = useRouter();
  const self: Party = {
    ...emptyParty(),
    name: user.name,
    organization: user.individual ? "" : user.organization,
    partyType: "CLIENT",
    email: user.email,
    phone: user.phone,
    representative: user.name,
    jobTitle: user.individual ? "" : user.jobTitle,
    address: user.address,
  };
  const [step, setStep] = useState(0);
  const [parties, setParties] = useState<Party[]>([self, emptyParty()]);
  const [linked, setLinked] = useState<Set<string>>(() => new Set([user.email.toLowerCase()]));
  const [restored, setRestored] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [spaces, setSpaces] = useState(workspaces);
  const [newSpace, setNewSpace] = useState("");
  const [query, setQuery] = useState("");
  const [typeId, setTypeId] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(TEAM_STORAGE) ?? "null") as { parties?: Party[]; linked?: string[] } | null;
      if (saved?.parties?.length && saved.parties[0]?.email === user.email) {
        setParties(saved.parties);
        setLinked(new Set([user.email.toLowerCase(), ...(saved.linked ?? [])]));
      }
    } catch {}
    setRestored(true);
  }, [user.email]);

  useEffect(() => {
    if (!restored) return;
    localStorage.setItem(TEAM_STORAGE, JSON.stringify({ parties, linked: [...linked] }));
  }, [parties, linked, restored]);

  const named = parties.filter((party) => party.name.trim() || party.organization.trim());
  const reachable = named.slice(1).filter((party) => party.email.trim());
  const visibleTypes = types.filter((type) => `${type.label} ${type.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selectedType = types.find((type) => type.id === typeId);

  function run(task: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError("");
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error ?? "Action impossible.");
      else after?.();
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Nouvelle entente</h1>
        <p className="mt-1 text-sm text-[#5e6875]">Composez l&apos;équipe, choisissez le type, écrivez ensemble, puis envoyez.</p>
      </div>
      <div className="mb-6">
        <StepTrail steps={AGREEMENT_STEPS} current={step} />
      </div>

      {step === 0 ? (
        <div className="space-y-4">
          <PartySearch
            added={parties.map((party) => party.email.toLowerCase())}
            onAdd={(person) => {
              addPerson(person);
              setLinked((current) => new Set(current).add(person.email.toLowerCase()));
            }}
          />
          {parties.map((party, index) => {
            const isLinked = linked.has(party.email.toLowerCase()) && Boolean(party.email);
            return (
              <Card key={index} className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-2 sm:col-span-2">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <span className="truncate">
                      {index === 0 ? "Vous" : `Partie ${index + 1}`}
                      {party.name && index > 0 ? ` · ${party.name}` : ""}
                    </span>
                    {isLinked ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e8f7ee] px-2 py-0.5 text-[11px] font-medium text-[#1f7a45]"><UserCheck className="h-3 w-3" />Compte Misterdil</span>
                    ) : party.email ? (
                      <span className="shrink-0 rounded-full bg-[#fff6e5] px-2 py-0.5 text-[11px] font-medium text-[#8a5a00]">Sera invité à s&apos;inscrire</span>
                    ) : null}
                  </p>
                  {index > 0 ? (
                    <button type="button" onClick={() => removeParty(index)} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#9f2d2d] hover:bg-[#fdf1f1]">
                      <Trash2 className="h-3.5 w-3.5" />Retirer
                    </button>
                  ) : null}
                </div>
                <Field label="Nom"><input className={controlClass} value={party.name} onChange={(event) => updateParty(index, { name: event.target.value })} /></Field>
                <Field label="Entreprise / organisation" hint={index === 0 && user.individual ? "Vous signez en tant que personne physique." : undefined}>
                  <input className={controlClass} value={party.organization} onChange={(event) => updateParty(index, { organization: event.target.value })} />
                </Field>
                <Field label="Rôle dans l'entente">
                  <select className={controlClass} value={party.partyType} onChange={(event) => updateParty(index, { partyType: event.target.value })}>
                    {PARTY_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </Field>
                <Field label="Courriel" hint={index > 0 && !party.email ? "Nécessaire pour l'inviter à participer." : undefined}>
                  <input type="email" className={controlClass} value={party.email} readOnly={index === 0} onChange={(event) => updateParty(index, { email: event.target.value })} />
                </Field>
                {index > 0 ? (
                  <Field label="Accès au document">
                    <select className={controlClass} value={party.accessRole} onChange={(event) => updateParty(index, { accessRole: event.target.value })}>
                      <option value="PARTICIPANT">Participant : lit, modifie et commente</option>
                      <option value="READER">Lecteur : consultation seule</option>
                    </select>
                  </Field>
                ) : null}
                <Field label="Représentant"><input className={controlClass} value={party.representative} onChange={(event) => updateParty(index, { representative: event.target.value })} /></Field>
                <Field label="Fonction"><input className={controlClass} value={party.jobTitle} onChange={(event) => updateParty(index, { jobTitle: event.target.value })} /></Field>
                <Field label="Téléphone" hint="Facultatif"><input className={controlClass} value={party.phone} onChange={(event) => updateParty(index, { phone: event.target.value })} /></Field>
                <Field label="Adresse" hint="Facultatif"><input className={controlClass} value={party.address} onChange={(event) => updateParty(index, { address: event.target.value })} /></Field>
              </Card>
            );
          })}
          <Button variant="secondary" type="button" onClick={() => setParties((current) => [...current, emptyParty()])}>
            <Plus className="h-4 w-4" />Saisir une partie non inscrite
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={named.length < 2} onClick={() => { setError(""); setStep(1); }}>Continuer</Button>
            <span className="text-sm text-[#5e6875]">
              {named.length < 2
                ? "Ajoutez au moins une autre partie."
                : reachable.length < named.length - 1
                  ? "Les parties sans courriel figureront dans l'entente, sans être invitées."
                  : `${named.length} parties dans l'équipe.`}
            </span>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Espace" hint={spaces.length ? "Un espace regroupe les ententes d'un même projet." : "Un premier espace sera créé automatiquement."}>
              <select className={controlClass} value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
                {spaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                {!spaces.length ? <option value="">Créé avec l&apos;entente</option> : null}
              </select>
            </Field>
            <Field label="Ou créer un espace">
              <div className="flex gap-2">
                <input className={controlClass} value={newSpace} onChange={(event) => setNewSpace(event.target.value)} placeholder="Nom du projet" />
                <Button variant="secondary" type="button" disabled={newSpace.trim().length < 2} onClick={() => run(async () => {
                  const created = await createWorkspace({ name: newSpace });
                  if (!created.ok) return created;
                  setSpaces((current) => [...current, { id: created.id, name: newSpace.trim() }]);
                  setWorkspaceId(created.id);
                  setNewSpace("");
                  return { ok: true };
                })}>Créer</Button>
              </div>
            </Field>
          </Card>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b939e]" />
            <input className={`${controlClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un type d'entente" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTypes.map((type) => {
              const Icon = ICONS[type.id as keyof typeof ICONS] ?? FileText;
              const selected = typeId === type.id;
              return (
                <button key={type.id} type="button" onClick={() => setTypeId(type.id)} className={cn("rounded-xl border bg-white p-4 text-left", selected ? "border-[#1e4ed8] ring-2 ring-[#d9e4ff]" : "border-[#e6e8ee] hover:border-[#c9d7fb]")}>
                  <Icon className="h-5 w-5 text-[#1e4ed8]" />
                  <p className="mt-3 font-medium">{type.label}</p>
                  <p className="mt-1 text-sm leading-5 text-[#5e6875]">{type.description}</p>
                </button>
              );
            })}
          </div>
          <Field label="Titre de l'entente" hint="Facultatif. Modifiable à tout moment.">
            <input className={controlClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={selectedType?.label ?? "Entente"} />
          </Field>
          <Card className="px-5 py-4 text-sm text-[#5e6875]">
            Les sections du type choisi sont créées vides et modifiables. Les parties sont reprises automatiquement. Rien n&apos;est envoyé avant votre confirmation.
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" type="button" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4" />Équipe</Button>
            <Button disabled={!typeId || pending} onClick={() => run(async () => {
              const created = await createAgreement({ workspaceId, typeId, title, parties });
              if (!created.ok) return created;
              localStorage.removeItem(TEAM_STORAGE);
              router.push(`/documents/${created.id}`);
              return { ok: true };
            })}>{pending ? "Création des sections..." : "Créer l'entente"}</Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-4 text-sm text-[#9f2d2d]">{error}</p> : null}
    </div>
  );

  function updateParty(index: number, patch: Partial<Party>) {
    setParties((current) => current.map((party, position) => (position === index ? { ...party, ...patch } : party)));
  }

  function removeParty(index: number) {
    setParties((current) => current.filter((_, position) => position !== index));
  }

  function addPerson(person: PersonMatch) {
    setParties((current) => {
      if (current.some((party) => party.email.toLowerCase() === person.email)) return current;
      const added: Party = {
        ...emptyParty(),
        name: person.name,
        organization: person.organization,
        email: person.email,
        phone: person.phone,
        representative: person.name,
        jobTitle: person.jobTitle,
      };
      const blank = current.findIndex((party, position) => position > 0 && !party.name.trim() && !party.organization.trim() && !party.email.trim());
      return blank >= 0 ? current.map((party, position) => (position === blank ? added : party)) : [...current, added];
    });
  }
}

function AssistantPrefill({ draft, sectors }: { draft: Draft; sectors: SectorOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(draft.brief ? 2 : draft.sector && draft.domain ? 1 : 0);
  const [sector, setSector] = useState(draft.sector);
  const [domain, setDomain] = useState(draft.domain);
  const [extraDomains, setExtraDomains] = useState<string[]>(() =>
    draft.domain && !(sectors.find((item) => item.id === draft.sector)?.domains ?? []).includes(draft.domain) ? [draft.domain] : [],
  );
  const [suggesting, setSuggesting] = useState(false);
  const [domainNote, setDomainNote] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [description, setDescription] = useState(draft.description);
  const [brief, setBrief] = useState<Brief | null>(draft.brief);
  const [editingBrief, setEditingBrief] = useState(false);
  const [fields, setFields] = useState<FieldOption[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>(draft.responses);
  const [title, setTitle] = useState(draft.title);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const sectorDef = sectors.find((item) => item.id === sector);
  const domains = [...(sectorDef?.domains ?? []), ...extraDomains.filter((item) => !(sectorDef?.domains ?? []).includes(item))];
  const required = fields.filter((field) => field.required);
  const missing = required.filter((field) => !responses[field.key]?.trim());
  const completion = required.length ? Math.round(((required.length - missing.length) / required.length) * 100) : 0;
  const groups = useMemo(() => {
    const map = new Map<string, FieldOption[]>();
    for (const field of fields) map.set(field.group, [...(map.get(field.group) ?? []), field]);
    return [...map.entries()];
  }, [fields]);

  useEffect(() => {
    if (step < 2) return;
    let cancelled = false;
    loadFields(draft.typeId, sector || draft.sector).then((items) => {
      if (!cancelled) setFields(items);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.typeId, draft.sector, sector, step]);

  function run(task: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError("");
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error ?? "Action impossible.");
      else after?.();
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={`/documents/${draft.id}`} className="inline-flex items-center gap-1 text-sm text-[#1e4ed8]"><ArrowLeft className="h-4 w-4" />Retour au document</Link>
      <div className="mb-6 mt-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Sparkles className="h-5 w-5 text-[#1e4ed8]" />Pré-remplir avec l&apos;assistant</h1>
        <p className="mt-1 text-sm text-[#5e6875]">{draft.typeLabel} · Misterdil AI propose un premier texte pour chaque section. Vous et les parties gardez la main.</p>
      </div>
      {draft.hasContent ? (
        <p className="mb-4 rounded-xl border border-[#f3d6a4] bg-[#fff8ec] p-3 text-sm text-[#7a4b0c]">
          Le texte déjà écrit dans les sections sera remplacé par la proposition. Une version est conservée dans l&apos;historique.
        </p>
      ) : null}
      <div className="mb-6">
        <StepTrail steps={ASSISTANT_STEPS} current={step} />
      </div>

      {step === 0 ? (
        <Card className="space-y-4 p-5">
          <Field label="Secteur d'activité">
            <select className={controlClass} value={sector} onChange={(event) => { setSector(event.target.value); setDomain(""); }}>
              <option value="">Choisir</option>
              {sectors.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Domaine" hint="La liste change selon le secteur.">
            <select className={controlClass} value={domain} onChange={(event) => setDomain(event.target.value)}>
              <option value="">Choisir</option>
              {domains.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" type="button" disabled={!sector || suggesting} onClick={suggestMoreDomains}>
                <Sparkles className="h-4 w-4" />
                {suggesting ? "Recherche de domaines..." : "Suggérer d'autres domaines"}
              </Button>
              {!sector ? <span className="text-xs text-[#8b939e]">Choisissez d&apos;abord un secteur.</span> : null}
            </div>
            {extraDomains.length ? (
              <div className="flex flex-wrap gap-2">
                {extraDomains.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDomain(item)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      domain === item ? "border-[#1e4ed8] bg-[#1e4ed8] text-white" : "border-[#c9d7fb] bg-[#eef3ff] text-[#1e4ed8] hover:bg-[#dfe8ff]",
                    )}
                  >
                    {domain === item ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
            {domainNote ? <p className="text-xs text-[#5e6875]">{domainNote}</p> : null}
            <div className="flex gap-2">
              <input
                className={controlClass}
                value={customDomain}
                onChange={(event) => setCustomDomain(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomDomain();
                  }
                }}
                placeholder="Ou saisissez votre domaine"
                disabled={!sector}
              />
              <Button variant="secondary" type="button" disabled={!sector || !customDomain.trim()} onClick={addCustomDomain}>Ajouter</Button>
            </div>
          </div>
          <div>
            <Button disabled={!sector || !domain} onClick={() => run(() => saveContext(draft.id, sector, domain), () => setStep(1))}>Continuer</Button>
          </div>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card className="space-y-4 p-5">
          <Field label="Décrivez votre projet ou votre entente en quelques phrases.">
            <textarea className={`${controlClass} min-h-32`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Nous souhaitons conclure une entente avec une entreprise informatique pour développer une application mobile destinée à nos clients." />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" type="button" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4" />Contexte</Button>
            <Button variant="secondary" type="button" disabled={description.trim().length < 10 || pending} onClick={() => run(async () => {
              await saveDescription(draft.id, description);
              const result = await analyzeProject(draft.id, description);
              if (!result.ok) return result;
              setBrief(result.understanding);
              setEditingBrief(false);
              return { ok: true };
            })}>{pending ? "Analyse..." : "Analyser"}</Button>
          </div>
          {brief ? (
            <div className="rounded-xl border border-[#e6e8ee] bg-[#f7f8fb] p-4">
              <p className="text-sm font-medium">Ce que Misterdil a compris</p>
              {editingBrief ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(["objectif", "client", "prestataire", "duree"] as const).map((key) => (
                    <Field key={key} label={key === "duree" ? "Durée estimée" : key[0].toUpperCase() + key.slice(1)}>
                      <input className={controlClass} value={brief[key]} onChange={(event) => setBrief({ ...brief, [key]: event.target.value })} />
                    </Field>
                  ))}
                </div>
              ) : (
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-[#8b939e]">Objectif</dt><dd>{brief.objectif}</dd></div>
                  <div><dt className="text-[#8b939e]">Client</dt><dd>{brief.client}</dd></div>
                  <div><dt className="text-[#8b939e]">Prestataire</dt><dd>{brief.prestataire}</dd></div>
                  <div><dt className="text-[#8b939e]">Durée estimée</dt><dd>{brief.duree}</dd></div>
                </dl>
              )}
              <p className="mt-4 text-sm">Est-ce correct ?</p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" type="button" onClick={() => setEditingBrief(true)}>Modifier</Button>
                <Button type="button" onClick={() => run(() => confirmBrief(draft.id, brief), () => setStep(2))}>Confirmer</Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-sm">Le questionnaire est complété à {completion} %. {missing.length ? `${missing.length} information${missing.length > 1 ? "s" : ""} encore nécessaire${missing.length > 1 ? "s" : ""}.` : "Les informations essentielles sont là."}</p>
            <Button disabled={!fields.length || missing.length > 0 || pending} onClick={() => run(async () => {
              const stored = await saveResponses(draft.id, responses);
              if (!stored.ok) return stored;
              const saved = await saveTitle(draft.id, title || draft.typeLabel);
              if (!saved.ok) return saved;
              const generated = await generateDocument(draft.id, title || draft.typeLabel);
              if (!generated.ok) return generated;
              router.push(`/documents/${draft.id}`);
              return { ok: true };
            })}>{pending ? "Rédaction..." : "Pré-remplir les sections"}</Button>
          </Card>
          <Field label="Titre du document">
            <input className={controlClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={draft.typeLabel} />
          </Field>
          {groups.map(([group, items]) => (
            <Card key={group} className="space-y-4 p-5">
              <h2 className="font-semibold">{group}</h2>
              {items.map((field) => (
                <Field key={field.key} label={`${field.label}${field.required ? " *" : ""}`} hint={field.help}>
                  {field.fieldType === "textarea" ? (
                    <textarea className={`${controlClass} min-h-24`} value={responses[field.key] ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [field.key]: event.target.value }))} onBlur={(event) => saveResponse(draft.id, field.key, event.target.value)} />
                  ) : (
                    <input type={field.fieldType === "date" ? "date" : "text"} className={controlClass} value={responses[field.key] ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [field.key]: event.target.value }))} onBlur={(event) => saveResponse(draft.id, field.key, event.target.value)} />
                  )}
                </Field>
              ))}
            </Card>
          ))}
        </div>
      ) : null}
      {error ? <p className="mt-4 text-sm text-[#9f2d2d]">{error}</p> : null}
    </div>
  );

  function suggestMoreDomains() {
    setDomainNote("");
    setSuggesting(true);
    moreDomains(sector, domains)
      .then((result) => {
        const known = new Set(domains.map((item) => item.toLowerCase()));
        const fresh = result.ok ? result.domains.filter((item) => !known.has(item.toLowerCase())) : [];
        if (!result.ok) setDomainNote("La suggestion n'a pas abouti. Réessayez ou saisissez votre domaine.");
        else if (!fresh.length) setDomainNote("Aucun nouveau domaine pour ce secteur. Saisissez le vôtre ci-dessous.");
        else {
          setExtraDomains((current) => [...current, ...fresh]);
          if (!domain) setDomain(fresh[0]);
          setDomainNote(`${fresh.length} domaine${fresh.length > 1 ? "s" : ""} ajouté${fresh.length > 1 ? "s" : ""} à la liste. Cliquez pour choisir.`);
        }
      })
      .catch(() => setDomainNote("La suggestion n'a pas abouti. Réessayez ou saisissez votre domaine."))
      .finally(() => setSuggesting(false));
  }

  function addCustomDomain() {
    const value = customDomain.trim();
    if (!value) return;
    if (!domains.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setExtraDomains((current) => [...current, value]);
    }
    setDomain(domains.find((item) => item.toLowerCase() === value.toLowerCase()) ?? value);
    setCustomDomain("");
    setDomainNote("");
  }
}
