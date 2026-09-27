"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
