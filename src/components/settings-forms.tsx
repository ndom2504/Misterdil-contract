"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword, updateProfile, type FormState } from "@/server/actions/auth";
import { Button, Field, controlClass } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";

export function AvatarForm({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(request: Promise<Response>) {
    setPending(true);
    setError("");
    const response = await request;
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "La photo n'a pas pu être enregistrée.");
    }
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <UserAvatar name={name} url={avatarUrl} size={72} />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => input.current?.click()}>
            {pending ? "Envoi…" : avatarUrl ? "Changer la photo" : "Ajouter une photo"}
          </Button>
          {avatarUrl ? (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => void submit(fetch("/api/avatar", { method: "DELETE" }))}>
              Retirer
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-[#8b939e]">JPG, PNG ou WebP, 5 Mo maximum. Visible par les parties de vos ententes.</p>
        {error ? <p className="text-sm text-[#9f2d2d]">{error}</p> : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const form = new FormData();
          form.append("file", file);
          void submit(fetch("/api/avatar", { method: "POST", body: form }));
        }}
      />
    </div>
  );
}

export function ProfileForm({ user }: { user: { name: string; jobTitle: string; phone: string; organization: string } }) {
  const [state, action, pending] = useActionState(updateProfile, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <Field label="Nom"><input name="name" defaultValue={user.name} className={controlClass} /></Field>
      <Field label="Fonction"><input name="jobTitle" defaultValue={user.jobTitle} className={controlClass} /></Field>
      <Field label="Téléphone"><input name="phone" defaultValue={user.phone} className={controlClass} /></Field>
      <Field label="Organisation"><input name="organization" defaultValue={user.organization} className={controlClass} /></Field>
      {state.error ? <p className="text-sm text-[#9f2d2d]">{state.error}</p> : null}
      {!state.error && pending === false && state !== undefined ? null : null}
      <Button disabled={pending}>Enregistrer</Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <Field label="Mot de passe actuel"><input name="current" type="password" className={controlClass} /></Field>
      <Field label="Nouveau mot de passe"><input name="next" type="password" className={controlClass} /></Field>
      {state.error ? <p className="text-sm text-[#9f2d2d]">{state.error}</p> : null}
      <Button disabled={pending}>Mettre à jour</Button>
    </form>
  );
}
