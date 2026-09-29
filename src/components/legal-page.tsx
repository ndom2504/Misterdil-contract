import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export type LegalSection = { title: string; body: ReactNode };

export function LegalPage({ title, intro, updated, sections }: { title: string; intro: string; updated: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen bg-[#07111c] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(47,124,246,0.18),transparent_52%)]" />
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5">
          <Link href="/" className="flex">
            <Logo tone="light" stack />
          </Link>
          <Link href="/connexion" className="rounded-full border border-white/25 px-4 py-2 text-sm hover:bg-white/10">Se connecter</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-14">
        <p className="text-sm text-[#8eb6ff]">Mise à jour : {updated}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 text-base leading-8 text-white/75">{intro}</p>

        <nav className="mt-8 rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">Sommaire</p>
          <ol className="mt-3 grid gap-1.5 text-sm text-white/75 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.title}>
                <a href={`#section-${index + 1}`} className="hover:text-white">{index + 1}. {section.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((section, index) => (
            <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-8">
              <h2 className="text-xl font-semibold">{index + 1}. {section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-white/75 [&_a]:text-[#8eb6ff] [&_a]:underline [&_li]:ml-5 [&_li]:list-disc">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-5 py-8 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Misterdil</span>
          <div className="flex gap-5">
            <Link href="/conditions" className="hover:text-white">Conditions d&apos;utilisation</Link>
            <Link href="/confidentialite" className="hover:text-white">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
