"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileSignature,
  FileText,
  Handshake,
  Lock,
  Package,
  PenLine,
  ScrollText,
  Search,
  Users,
  Wrench,
  ClipboardList,
} from "lucide-react";
import { analyzeProject, moreDomains } from "@/server/actions/assistant";
import { saveParties } from "@/server/actions/collaboration";
import { confirmBrief, createDraft, generateDocument, loadFields, saveContext, saveDescription, saveResponse, saveResponses, saveTitle } from "@/server/actions/documents";
import { createWorkspace } from "@/server/actions/workspaces";
import { PARTY_TYPES } from "@/lib/domain";
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

const STEPS = ["Type", "Contexte", "Projet", "Parties", "Informations", "Génération"];

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
  wizardStep: number;
  responses: Record<string, string>;
  stakeholders: Party[];
  moderatorId: string | null;
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
  user: { id: string; name: string; email: string; organization: string; jobTitle: string };
  draft: Draft | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(draft ? Math.min(Math.max(draft.wizardStep, 2), 6) - 1 : 0);
  const [workspaceId, setWorkspaceId] = useState(draft ? "" : workspaces[0]?.id ?? "");
  const [newSpace, setNewSpace] = useState("");
  const [query, setQuery] = useState("");
  const [typeId, setTypeId] = useState(draft?.typeId ?? "");
  const [sector, setSector] = useState(draft?.sector ?? "");
  const [domain, setDomain] = useState(draft?.domain ?? "");
  const [extraDomains, setExtraDomains] = useState<string[]>([]);
  const [description, setDescription] = useState(draft?.description ?? "");
  const [brief, setBrief] = useState<Brief | null>(draft?.brief ?? null);
  const [editingBrief, setEditingBrief] = useState(false);
  const [parties, setParties] = useState<Party[]>(
    draft?.stakeholders.length
      ? draft.stakeholders
      : [{ ...emptyParty(), name: user.name, organization: user.organization, partyType: "CLIENT", email: user.email, representative: user.name, jobTitle: user.jobTitle, accessRole: "PARTICIPANT" }],
  );
  const [fields, setFields] = useState<FieldOption[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>(draft?.responses ?? {});
  const [title, setTitle] = useState(draft?.title ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const visibleTypes = types.filter((type) => `${type.label} ${type.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const sectorDef = sectors.find((item) => item.id === sector);
  const domains = [...(sectorDef?.domains ?? []), ...extraDomains.filter((item) => !(sectorDef?.domains ?? []).includes(item))];
  const required = fields.filter((field) => field.required);
  const missing = required.filter((field) => !responses[field.key]?.trim());
  const completion = required.length ? Math.round(((required.length - missing.length) / required.length) * 100) : 0;
  const groups = useMemo(() => {
    const map = new Map<string, FieldOption[]>();
    for (const field of fields) {
      map.set(field.group, [...(map.get(field.group) ?? []), field]);
    }
    return [...map.entries()];
  }, [fields]);

  useEffect(() => {
    if (!draft || step < 4) return;
    let cancelled = false;
    loadFields(draft.typeId, sector || draft.sector).then((items) => {
      if (!cancelled) setFields(items);
    });
    return () => {
      cancelled = true;
    };
  }, [draft, sector, step]);

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
        <p className="mt-1 text-sm text-[#5e6875]">Une étape à la fois. Vous pourrez tout reprendre plus tard.</p>
      </div>
      <ol className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STEPS.map((label, index) => (
          <li key={label} className={cn("rounded-lg border px-3 py-2 text-xs", index === step ? "border-[#1e4ed8] bg-[#eef3ff] font-medium text-[#1e4ed8]" : index < step ? "border-[#d9e4ff] bg-white text-[#1e4ed8]" : "border-[#e6e8ee] bg-white text-[#8b939e]")}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="space-y-4">
          <Card className="p-5">
            <Field label="Espace">
              <select className={controlClass} value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
                {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                {!workspaces.length ? <option value="">Aucun espace</option> : null}
              </select>
            </Field>
            <div className="mt-3 flex gap-2">
              <input className={controlClass} value={newSpace} onChange={(event) => setNewSpace(event.target.value)} placeholder="Ou créer un espace" />
              <Button variant="secondary" type="button" onClick={() => run(async () => {
                const created = await createWorkspace({ name: newSpace });
                if (!created.ok) return created;
                setWorkspaceId(created.id);
                setNewSpace("");
                router.refresh();
                return { ok: true };
              })}>Créer</Button>
            </div>
          </Card>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b939e]" />
            <input className={`${controlClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un type" />
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
          <Button disabled={!typeId || (!workspaceId && !workspaces.length)} onClick={() => run(async () => {
            const created = await createDraft(workspaceId, typeId);
            if (!created.ok) return created;
            router.push(`/documents/nouveau?brouillon=${created.id}`);
            return { ok: true };
          })}>{pending ? "Création..." : "Continuer"}</Button>
        </div>
      ) : null}

      {draft && step === 1 ? (
        <Card className="space-y-4 p-5">
          <p className="text-sm text-[#5e6875]">Type retenu : {draft.typeLabel}</p>
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
          <Button variant="secondary" type="button" disabled={!sector} onClick={() => run(async () => {
            const result = await moreDomains(sector, domains);
            if (!result.ok) return { ok: false, error: "Suggestion impossible." };
            setExtraDomains((current) => [...current, ...result.domains]);
            return { ok: true };
          })}>Suggérer d&apos;autres domaines</Button>
          <div>
            <Button disabled={!sector || !domain} onClick={() => run(() => saveContext(draft.id, sector, domain), () => setStep(2))}>Continuer</Button>
          </div>
        </Card>
      ) : null}

      {draft && step === 2 ? (
        <Card className="space-y-4 p-5">
          <Field label="Décrivez votre projet ou votre entente en quelques phrases.">
            <textarea className={`${controlClass} min-h-32`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Nous souhaitons conclure une entente avec une entreprise informatique pour développer une application mobile destinée à nos clients." />
          </Field>
          <Button variant="secondary" type="button" onClick={() => run(async () => {
            await saveDescription(draft.id, description);
            const result = await analyzeProject(draft.id, description);
            if (!result.ok) return result;
            setBrief(result.understanding);
            setEditingBrief(false);
            return { ok: true };
          })}>{pending ? "Analyse..." : "Analyser"}</Button>
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
                <Button type="button" onClick={() => run(() => confirmBrief(draft.id, brief), () => setStep(3))}>Confirmer</Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {draft && step === 3 ? (
        <div className="space-y-4">
          {parties.map((party, index) => (
            <Card key={index} className="grid gap-3 p-5 sm:grid-cols-2">
              <Field label="Nom"><input className={controlClass} value={party.name} onChange={(event) => updateParty(index, { name: event.target.value })} /></Field>
              <Field label="Entreprise / organisation"><input className={controlClass} value={party.organization} onChange={(event) => updateParty(index, { organization: event.target.value })} /></Field>
              <Field label="Rôle">
                <select className={controlClass} value={party.partyType} onChange={(event) => updateParty(index, { partyType: event.target.value })}>
                  {PARTY_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </Field>
              <Field label="Courriel"><input className={controlClass} value={party.email} onChange={(event) => updateParty(index, { email: event.target.value })} /></Field>
              <Field label="Téléphone" hint="Facultatif"><input className={controlClass} value={party.phone} onChange={(event) => updateParty(index, { phone: event.target.value })} /></Field>
              <Field label="Représentant"><input className={controlClass} value={party.representative} onChange={(event) => updateParty(index, { representative: event.target.value })} /></Field>
              <Field label="Fonction"><input className={controlClass} value={party.jobTitle} onChange={(event) => updateParty(index, { jobTitle: event.target.value })} /></Field>
              <Field label="Adresse" hint="Facultatif"><input className={controlClass} value={party.address} onChange={(event) => updateParty(index, { address: event.target.value })} /></Field>
            </Card>
          ))}
          <Button variant="secondary" type="button" onClick={() => setParties((current) => [...current, emptyParty()])}>Ajouter une partie</Button>
          <p className="text-sm text-[#5e6875]">Modérateur : {user.name}. Vous pourrez le changer ensuite.</p>
          <Button onClick={() => run(() => saveParties(draft.id, parties, user.id), () => setStep(4))}>Continuer</Button>
        </div>
      ) : null}

      {draft && step >= 4 ? (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-sm">Le formulaire est complété à {completion} %. {missing.length ? `${missing.length} information${missing.length > 1 ? "s" : ""} encore nécessaire${missing.length > 1 ? "s" : ""}.` : "Les informations essentielles sont là."}</p>
            <Button disabled={!fields.length || missing.length > 0 || pending} onClick={() => run(async () => {
              const stored = await saveResponses(draft.id, responses);
              if (!stored.ok) return stored;
              const saved = await saveTitle(draft.id, title || draft.typeLabel);
              if (!saved.ok) return saved;
              const generated = await generateDocument(draft.id, title || draft.typeLabel);
              if (!generated.ok) return generated;
              router.push(`/documents/${draft.id}`);
              return { ok: true };
            })}>{pending ? "Génération..." : "Générer une première version"}</Button>
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

  function updateParty(index: number, patch: Partial<Party>) {
    setParties((current) => current.map((party, position) => position === index ? { ...party, ...patch } : party));
  }
}
