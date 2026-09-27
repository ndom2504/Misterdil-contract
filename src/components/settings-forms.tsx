"use client";

import { useActionState } from "react";
import { changePassword, updateProfile, type FormState } from "@/server/actions/auth";
import { Button, Field, controlClass } from "@/components/ui";

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
