"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { login, register, type FormState } from "@/server/actions/auth";
import { Logo } from "@/components/logo";

const initial: FormState = {};

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function MicrosoftButton() {
  return (
    <div>
      <p className="text-center text-xs text-[#8b939e]">Continuer avec</p>
      <a
        href="/api/auth/microsoft"
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e6e8ee] bg-white text-sm font-medium text-[#12151a] hover:bg-[#f7f8fb]"
      >
        <MicrosoftMark />
        Microsoft
      </a>
    </div>
  );
}

export function LoginForm({ next = "/accueil" }: { next?: string }) {
  const [state, action, pending] = useActionState(login, initial);
  const [visible, setVisible] = useState(false);

  return (
    <div className="rounded-[28px] bg-white p-7 text-[#12151a] shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
      <div className="flex flex-col items-center text-center">
        <Logo stack />
        <h2 className="mt-5 text-xl font-semibold">Connectez-vous à votre espace</h2>
        <p className="mt-1 max-w-xs text-sm leading-5 text-[#5e6875]">Accédez à vos projets et collaborez avec votre réseau en toute sécurité.</p>
      </div>
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="suivant" value={next} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Adresse courriel</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a0ab]" />
            <input name="email" type="email" required autoComplete="email" placeholder="votre@entreprise.com" className="h-11 w-full rounded-xl border border-[#e1e4ea] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#2f7cf6] focus:ring-2 focus:ring-[#d9e4ff]" />
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Mot de passe</span>
          <span className="relative block">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a0ab]" />
            <input name="password" type={visible ? "text" : "password"} required autoComplete="current-password" placeholder="Votre mot de passe" className="h-11 w-full rounded-xl border border-[#e1e4ea] bg-white pl-10 pr-10 text-sm outline-none focus:border-[#2f7cf6] focus:ring-2 focus:ring-[#d9e4ff]" />
            <button type="button" onClick={() => setVisible((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98a0ab]" aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>
        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 text-[#3f4854]">
            <input name="remember" value="1" type="checkbox" defaultChecked className="h-4 w-4 accent-[#2f7cf6]" />
            Se souvenir de moi
          </label>
          <Link href="/mot-de-passe" className="font-medium text-[#2f7cf6]">Mot de passe oublié ?</Link>
        </div>
        {state.error ? <p className="text-sm text-[#9f2d2d]">{state.error}</p> : null}
        <button type="submit" disabled={pending} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#2f7cf6] text-sm font-medium text-white hover:bg-[#1d68e0] disabled:opacity-60">
          {pending ? "Connexion..." : "Se connecter →"}
        </button>
      </form>
      <div className="mt-5">
        <MicrosoftButton />
      </div>
      <p className="mt-5 text-center text-sm text-[#5e6875]">
        Vous n&apos;avez pas de compte ? <Link href="/inscription" className="font-medium text-[#2f7cf6]">Créer un compte</Link>
      </p>
      <div className="mt-5 flex gap-3 rounded-2xl bg-[#f4f8ff] p-4 text-sm text-[#3f4854]">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2f7cf6]" />
        <p><span className="font-medium text-[#12151a]">Vos données sont protégées.</span> L&apos;accès reste limité aux personnes invitées dans chaque espace.</p>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-[#8b939e]">Démonstration : jean.dupont@horizon.ca · Misterdil2026</p>
    </div>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initial);
  const [visible, setVisible] = useState(false);

  return (
    <div className="rounded-[28px] bg-white p-7 text-[#12151a] shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
      <div className="flex flex-col items-center text-center">
        <Logo stack />
        <h2 className="mt-5 text-xl font-semibold">Créer un compte</h2>
        <p className="mt-1 max-w-xs text-sm leading-5 text-[#5e6875]">Ouvrez votre espace, puis votre première entente.</p>
      </div>
      <form action={action} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Nom</span>
          <input name="name" required autoComplete="name" placeholder="Votre nom" className="h-11 w-full rounded-xl border border-[#e1e4ea] px-3 text-sm outline-none focus:border-[#2f7cf6] focus:ring-2 focus:ring-[#d9e4ff]" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Adresse courriel</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a0ab]" />
            <input name="email" type="email" required autoComplete="email" placeholder="votre@entreprise.com" className="h-11 w-full rounded-xl border border-[#e1e4ea] pl-10 pr-3 text-sm outline-none focus:border-[#2f7cf6] focus:ring-2 focus:ring-[#d9e4ff]" />
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Mot de passe</span>
          <span className="relative block">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a0ab]" />
            <input name="password" type={visible ? "text" : "password"} required autoComplete="new-password" placeholder="Au moins 8 caractères" className="h-11 w-full rounded-xl border border-[#e1e4ea] pl-10 pr-10 text-sm outline-none focus:border-[#2f7cf6] focus:ring-2 focus:ring-[#d9e4ff]" />
            <button type="button" onClick={() => setVisible((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98a0ab]" aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>
        {state.error ? <p className="text-sm text-[#9f2d2d]">{state.error}</p> : null}
        <button type="submit" disabled={pending} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#2f7cf6] text-sm font-medium text-white hover:bg-[#1d68e0] disabled:opacity-60">
          {pending ? "Création..." : "Créer un compte →"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-[#5e6875]">
        Déjà un compte ? <Link href="/connexion" className="font-medium text-[#2f7cf6]">Se connecter</Link>
      </p>
    </div>
  );
}
