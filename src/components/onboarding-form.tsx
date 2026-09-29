"use client";

import { useActionState, useState } from "react";
import { Building2, UserRound } from "lucide-react";
import { SECTORS } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { completeOnboarding, type FormState } from "@/server/actions/auth";
import { Button, Field, controlClass } from "@/components/ui";

type Kind = "ORGANIZATION" | "INDIVIDUAL";

const KINDS: { id: Kind; label: string; hint: string; icon: typeof Building2 }[] = [
  { id: "ORGANIZATION", label: "Une organisation", hint: "Entreprise, OBNL, organisme public ou travailleur autonome.", icon: Building2 },
  { id: "INDIVIDUAL", label: "Une personne physique", hint: "Entente entre particuliers, en votre nom propre.", icon: UserRound },
];

export function OnboardingForm({ name, next }: { name: string; next: string }) {
  const [state, action, pending] = useActionState(completeOnboarding, {} as FormState);
  const [kind, setKind] = useState<Kind>("ORGANIZATION");

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="suivant" value={next} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Vous signez en tant que</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setKind(item.id)}
              aria-pressed={kind === item.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                kind === item.id ? "border-[#1e4ed8] bg-[#eef3ff]" : "border-[#e6e8ee] bg-white hover:bg-[#f7f8fb]",
              )}
            >
              <item.icon className={cn("mt-0.5 h-5 w-5 shrink-0", kind === item.id ? "text-[#1e4ed8]" : "text-[#8b939e]")} />
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-[#5e6875]">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Nom complet">
        <input name="name" required defaultValue={name} autoComplete="name" className={controlClass} />
      </Field>

      {kind === "ORGANIZATION" ? (
        <>
          <Field label="Organisation" hint="Le nom qui figurera dans vos ententes.">
            <input name="organization" required className={controlClass} placeholder="Raison sociale" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Votre fonction">
              <input name="jobTitle" className={controlClass} placeholder="Directrice, associé..." />
            </Field>
            <Field label="Secteur">
              <select name="sector" className={controlClass} defaultValue="">
                <option value="">À préciser</option>
                {SECTORS.map((sector) => <option key={sector.id} value={sector.id}>{sector.label}</option>)}
              </select>
            </Field>
          </div>
        </>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Adresse" hint="Facultatif. Reprise dans la fiche des parties.">
          <input name="address" autoComplete="street-address" className={controlClass} />
        </Field>
        <Field label="Téléphone" hint="Facultatif.">
          <input name="phone" type="tel" autoComplete="tel" className={controlClass} />
        </Field>
      </div>

      {state.error ? <p className="text-sm text-[#9f2d2d]">{state.error}</p> : null}
      <Button disabled={pending} className="w-full sm:w-auto">
        {pending ? "Enregistrement..." : next ? "Continuer vers l'entente" : "Continuer"}
      </Button>
    </form>
  );
}
