"use client";

import { useActionState } from "react";
import { SECTORS } from "@/lib/catalog";
import { PROFILE_TYPES } from "@/lib/domain";
import { completeOnboarding, type FormState } from "@/server/actions/auth";
import { Button, Field, controlClass } from "@/components/ui";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(completeOnboarding, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <Field label="Organisation">
        <input name="organization" required className={controlClass} placeholder="Nom de votre organisation" />
      </Field>
      <Field label="Votre profil">
        <select name="profileType" required className={controlClass} defaultValue="">
          <option value="" disabled>Choisir</option>
          {PROFILE_TYPES.map((profile) => <option key={profile}>{profile}</option>)}
        </select>
      </Field>
      <Field label="Fonction">
        <input name="jobTitle" className={controlClass} placeholder="Directrice, conseiller, chef de projet..." />
      </Field>
      <Field label="Secteur">
        <select name="sector" className={controlClass} defaultValue="">
          <option value="">À préciser</option>
          {SECTORS.map((sector) => <option key={sector.id} value={sector.id}>{sector.label}</option>)}
        </select>
      </Field>
      <Field label="Premier espace" hint="Un espace regroupe les documents d'un projet.">
        <input name="workspace" required className={controlClass} placeholder="Mon premier espace" />
      </Field>
      {state.error ? <p className="text-sm text-[#9f2d2d]">{state.error}</p> : null}
      <Button disabled={pending}>{pending ? "Préparation..." : "Continuer vers ma première entente"}</Button>
    </form>
  );
}
