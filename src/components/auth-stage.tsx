import Image from "next/image";
import Link from "next/link";
import { FileText, Globe, PenLine, ShieldCheck, Users } from "lucide-react";
import { LandingTone } from "@/components/reveal";
import { Logo } from "@/components/logo";

const links = [
  { href: "/#fonctionnalites", label: "Fonctionnalités" },
  { href: "/#apropos", label: "À propos" },
  { href: "/#tarifs", label: "Tarifs" },
];

const features = [
  { icon: FileText, title: "Création intelligente", text: "Des formulaires adaptés à votre secteur", tint: "bg-[#2f7cf6]" },
  { icon: Users, title: "Collaboration en temps réel", text: "Toutes les parties au même endroit", tint: "bg-[#6d4aff]" },
  { icon: ShieldCheck, title: "Validation et suivi", text: "Un processus clair et transparent", tint: "bg-[#1f9d55]" },
  { icon: PenLine, title: "Signature électronique", text: "Finalisez vos ententes en toute sécurité", tint: "bg-[#c9892d]" },
];

export function AuthStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111c] text-white">
      <LandingTone />
      <Image src="/brand/hero-office.jpg" alt="" fill priority className="object-cover object-[center_40%]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#07111cf2_0%,#07111cd6_42%,#07111c99_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,28,0.35),transparent_22%,rgba(7,17,28,0.55)_100%)]" />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 lg:px-8">
        <Link href="/" className="flex">
          <Logo tone="light" stack />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">{item.label}</Link>
          ))}
          <a href="#contact" className="hover:text-white">Contact</a>
        </nav>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm backdrop-blur">
          <Globe className="h-4 w-4" /> Français
        </span>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 lg:pb-10">
        <div className="order-2 max-w-xl lg:order-1">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Créez vos ententes<br />
            <span className="text-[#3d92ff]">plus rapidement</span>
          </h1>
          <p className="mt-4 text-lg font-medium text-[#d7e6ff]">Une Collaboration plus smart</p>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/75">
            Misterdil relie votre réseau autour d&apos;une stratégie claire. La collaboration devient plus rapide pour créer, valider et signer vos contrats, chartes et cahiers des charges.
          </p>
          <ul className="mt-8 space-y-3">
            {features.map((item) => (
              <li key={item.title} className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tint} text-white`}>
                  <item.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="block text-xs text-white/65">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 border-t border-white/15 pt-5 text-sm">
            {[
              ["+ 50", "Types de documents"],
              ["+ 20", "Secteurs d'activité"],
              ["100 %", "Sécurisé et conforme"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-xl font-semibold">{value}</p>
                <p className="mt-1 text-xs text-white/60">{label}</p>
              </div>
            ))}
          </div>
          <p id="contact" className="mt-8 flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck className="h-4 w-4" /> Vos données sont protégées et confidentielles.
          </p>
        </div>
        <div className="order-1 lg:order-2 lg:justify-self-end">{children}</div>
      </main>
    </div>
  );
}
