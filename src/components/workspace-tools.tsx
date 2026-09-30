"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { MenuActions } from "@/components/color-picker";
import { SECTORS } from "@/lib/catalog";
import { createWorkspace } from "@/server/actions/workspaces";
import { Button, Field, controlClass } from "@/components/ui";

export function WorkspaceCreator() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) return <Button onClick={() => setOpen(true)}>Nouvel espace</Button>;

  return (
    <form className="grid gap-3 rounded-xl border border-[#e6e8ee] bg-white p-4 sm:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      startTransition(async () => {
        const result = await createWorkspace({
          name: String(data.get("name") ?? ""),
          description: String(data.get("description") ?? ""),
          sector: String(data.get("sector") ?? ""),
          domain: String(data.get("domain") ?? ""),
        });
        if (!result.ok) setError(result.error);
        else router.push(`/espaces/${result.id}`);
      });
    }}>
      <Field label="Nom"><input name="name" required className={controlClass} /></Field>
      <Field label="Secteur">
        <select name="sector" className={controlClass} defaultValue=""><option value="">À préciser</option>{SECTORS.map((sector) => <option key={sector.id} value={sector.id}>{sector.label}</option>)}</select>
      </Field>
      <Field label="Description"><input name="description" className={controlClass} /></Field>
      <Field label="Domaine"><input name="domain" className={controlClass} /></Field>
      {error ? <p className="text-sm text-[#9f2d2d] sm:col-span-2">{error}</p> : null}
      <Button disabled={pending}>{pending ? "Création..." : "Créer l'espace"}</Button>
    </form>
  );
}

export function WorkspaceSettings({ workspace }: { workspace: { id: string; name: string; documents: number; canDelete: boolean } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function remove() {
    const scope = workspace.documents
      ? `Ses ${workspace.documents} entente${workspace.documents > 1 ? "s" : ""}, leurs discussions et tous les fichiers seront effacés pour toutes les parties.`
      : "Ses fichiers et ses invitations seront effacés.";
    if (!window.confirm(`Supprimer définitivement l'espace « ${workspace.name} » ?\n\n${scope} Cette action est irréversible.`)) return;
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" }).catch(() => null);
      if (!response?.ok) {
        const data = (await response?.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "L'espace n'a pas pu être supprimé.");
        return;
      }
      router.push("/espaces");
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e6eef8] bg-white px-3 text-sm text-[#243040] hover:bg-[#f5f7fb] disabled:opacity-60">
        <Settings className="h-4 w-4" />
        {pending ? "Suppression…" : "Réglages de l'espace"}
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Fermer" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-[#e6eef8] bg-white p-2 shadow-lg">
            {workspace.canDelete ? (
              <MenuActions
                actions={[{ label: "Supprimer l'espace", hint: "Toutes ses ententes, discussions et fichiers", destructive: true, onSelect: remove }]}
                onDone={() => setOpen(false)}
              />
            ) : (
              <p className="px-2 py-1 text-xs text-[#8b939e]">Seul l&apos;administrateur ou le créateur de l&apos;espace peut le supprimer.</p>
            )}
          </div>
        </>
      ) : null}
      {error ? <p className="absolute right-0 mt-2 w-72 text-right text-sm text-[#9f2d2d]">{error}</p> : null}
    </div>
  );
}

export function UploadForm({ workspaceId, documentId }: { workspaceId: string; documentId?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      data.set("workspaceId", workspaceId);
      if (documentId) data.set("documentId", documentId);
      startTransition(async () => {
        const response = await fetch("/api/attachments", { method: "POST", body: data });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          setError(body.error ?? "Dépôt impossible.");
          return;
        }
        setError("");
        event.currentTarget.reset();
        router.refresh();
      });
    }}>
      <input name="file" type="file" required className="text-sm" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" />
      <Button variant="secondary" disabled={pending}>{pending ? "Dépôt..." : "Ajouter un fichier"}</Button>
      {error ? <span className="text-sm text-[#9f2d2d]">{error}</span> : null}
    </form>
  );
}
