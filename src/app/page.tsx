import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Factory,
  FileText,
  Globe,
  GraduationCap,
  HardHat,
  HeartPulse,
  Landmark,
  Lock,
  Monitor,
  PenLine,
  Play,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Sparkles,
  Users,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { LandingTone, Reveal } from "@/components/reveal";
import { revealChild } from "@/lib/reveal-child";

const nav = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#types", label: "Types de documents" },
  { href: "#secteurs", label: "Secteurs" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#apropos", label: "À propos" },
];

const types = ["Contrat", "Cahier des charges", "Charte", "Convention", "Protocole d'entente", "Partenariat", "Maintenance", "Sous-traitance", "Fourniture", "Confidentialité"];

const sectors = [
  { label: "Construction", text: "Bâtiment, génie civil, infrastructure, rénovation...", icon: HardHat, image: "/brand/sectors/construction.jpg" },
  { label: "Technologie", text: "Logiciels, IA, applications, services numériques...", icon: Monitor, image: "/brand/sectors/technologie.jpg" },
  { label: "Santé", text: "Hôpitaux, cliniques, équipements, services...", icon: HeartPulse, image: "/brand/sectors/sante.jpg" },
  { label: "Éducation", text: "Écoles, universités, formation, recherche...", icon: GraduationCap, image: "/brand/sectors/education.jpg" },
  { label: "Finance", text: "Banques, assurance, investissement, services...", icon: BarChart3, image: "/brand/sectors/finance.jpg" },
  { label: "Commerce", text: "Distribution, vente, e-commerce, franchise...", icon: ShoppingCart, image: "/brand/sectors/commerce.jpg" },
  { label: "Transport", text: "Logistique, mobilité, fret, transport de personnes...", icon: Truck, image: "/brand/sectors/transport.jpg" },
  { label: "Industrie", text: "Production, transformation, maintenance...", icon: Factory, image: "/brand/sectors/industrie.jpg" },
  { label: "Administration publique", text: "Services gouvernementaux, collectivités, organismes...", icon: Landmark, image: "/brand/sectors/administration.jpg" },
  { label: "Services professionnels", text: "Conseil, juridique, comptabilité, ingénierie...", icon: Users, image: "/brand/sectors/services.jpg" },
];

const steps = [
  { title: "Décrivez", text: "Choisissez le type d'entente, le secteur et la stratégie du projet. Le formulaire s'adapte." },
  { title: "Structurez", text: "Misterdil AI prépare une première version. Le modérateur reste maître du texte." },
  { title: "Collaborez", text: "Votre réseau commente, propose et discute au bon endroit, section par section." },
  { title: "Validez et signez", text: "Chaque section se ferme rapidement. Puis les parties valident et signent." },
];

const documents = [
  ["Contrat de prestation IT", "78 %", "En validation"],
  ["Cahier des charges", "45 %", "En discussion"],
  ["Entente de partenariat", "92 %", "Validé"],
  ["Contrat de maintenance", "60 %", "En discussion"],
];

const card = "rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_18px_50px_rgba(0,0,0,0.22)]";

export default function HomePage() {
  return (
    <div className="min-h-screen scroll-smooth bg-[#07111c] text-white">
      <LandingTone />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(47,124,246,0.18),transparent_52%),radial-gradient(ellipse_at_bottom,rgba(18,48,95,0.45),transparent_55%)]" />

      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[#07111c]/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link href="/" className="flex">
            <Logo tone="light" stack />
          </Link>
          <nav className="hidden items-center gap-5 text-[13px] text-white/85 xl:flex">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-white">{item.label}</a>
            ))}
            <details className="relative">
              <summary className="cursor-pointer list-none hover:text-white [&::-webkit-details-marker]:hidden">Ressources</summary>
              <div className="absolute right-0 mt-3 w-56 rounded-xl border border-white/10 bg-[#0d1b2e] p-2 text-sm shadow-xl">
                <a href="#fonctionnement" className="block rounded-lg px-3 py-2 hover:bg-white/10">Comment ça fonctionne</a>
                <a href="#ressources" className="block rounded-lg px-3 py-2 hover:bg-white/10">Ressources</a>
                <a href="#securite" className="block rounded-lg px-3 py-2 hover:bg-white/10">Sécurité</a>
              </div>
            </details>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/connexion" className="hidden rounded-full border border-white/25 px-4 py-2 text-sm text-white hover:bg-white/10 sm:inline-flex">Se connecter</Link>
            <Link href="/inscription" className="inline-flex items-center gap-1 rounded-full bg-[#2f7cf6] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d68e0]">
              Créer un compte <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="hidden items-center gap-1 text-sm text-white/80 sm:inline-flex"><Globe className="h-4 w-4" /> Fr</span>
            <details className="relative xl:hidden">
              <summary className="cursor-pointer list-none rounded-full border border-white/25 px-3 py-2 text-sm text-white [&::-webkit-details-marker]:hidden">Menu</summary>
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0d1b2e] p-2 text-sm shadow-xl">
                {nav.map((item) => (
                  <a key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-white/90 hover:bg-white/10">{item.label}</a>
                ))}
                <a href="#ressources" className="block rounded-lg px-3 py-2 text-white/90 hover:bg-white/10">Ressources</a>
                <Link href="/connexion" className="block rounded-lg px-3 py-2 text-white/90 hover:bg-white/10">Se connecter</Link>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <Image src="/brand/hero-office.jpg" alt="" fill priority className="object-cover object-[center_30%]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#07111cf0_0%,#07111ccc_46%,#07111c73_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,28,0.28),transparent_18%,transparent_62%,#07111c_100%)]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-28 pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] lg:px-8 lg:pt-36">
            <div className="hero-rise">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#8eb6ff]">LA PLATEFORME INTELLIGENTE</p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                Créez vos ententes<br />
                <span className="text-[#3d92ff]">plus rapidement</span>
              </h1>
              <p className="mt-4 text-xl font-medium text-[#d7e6ff] sm:text-2xl">Une Collaboration plus smart</p>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
                Reliez votre réseau, alignez la stratégie et passez à une collaboration plus rapide. Misterdil crée, structure, valide et fait signer vos contrats, chartes et cahiers des charges au même endroit.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/inscription" className="inline-flex items-center gap-2 rounded-full bg-[#2f7cf6] px-5 py-3 text-sm font-medium text-white shadow-[0_10px_30px_rgba(47,124,246,0.35)] hover:bg-[#1d68e0]">
                  Créer une entente <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#fonctionnement" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur hover:bg-white/15">
                  <Play className="h-4 w-4 fill-white" /> Découvrir Misterdil
                </a>
              </div>
              <ul className="mt-10 grid grid-cols-2 gap-4 text-sm text-white/85 sm:grid-cols-4">
                {[
                  ["Création intelligente", Sparkles],
                  ["Collaboration en temps réel", Users],
                  ["Validation et suivi", ShieldCheck],
                  ["Signature électronique", PenLine],
                ].map(([label, Icon]) => (
                  <li key={label as string} className="flex flex-col items-start gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                      <Icon className="h-4 w-4 text-[#8eb6ff]" />
                    </span>
                    <span className="max-w-[9rem] leading-5">{label as string}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hero-rise relative" style={{ animationDelay: "160ms" }}>
              <div className="absolute -right-2 top-0 z-10 hidden w-56 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-md xl:block">
                <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-[#8eb6ff]" /> Assistant Misterdil</p>
                <p className="mt-2 text-xs leading-5 text-white/75">Générez, analysez et optimisez vos documents avec l&apos;IA.</p>
              </div>
              <div className="absolute -right-1 top-[42%] z-10 hidden w-52 rounded-2xl border border-white/20 bg-[#12305f]/80 p-4 text-sm shadow-2xl backdrop-blur-md xl:block">
                <Users className="mb-2 h-4 w-4 text-[#8eb6ff]" />
                Collaborez en temps réel avec toutes les parties prenantes.
              </div>
              <div className="absolute -right-2 bottom-10 z-10 hidden w-52 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm shadow-2xl backdrop-blur-md xl:block">
                <PenLine className="mb-2 h-4 w-4 text-[#8eb6ff]" />
                Signez vos ententes en toute sécurité.
              </div>

              <div className="relative mr-0 rounded-[1.4rem] border border-white/15 bg-[#0c1524]/80 p-2 shadow-[0_30px_80px_rgba(0,0,0,0.45)] xl:mr-16">
                <div className="overflow-hidden rounded-xl bg-white text-[#12151a]">
                  <div className="flex items-center justify-between border-b border-[#eef0f3] px-3 py-2">
                    <Logo stack className="scale-90" />
                    <span className="rounded-full bg-[#2f7cf6] px-2 py-1 text-[10px] font-medium text-white">Nouvelle entente</span>
                  </div>
                  <div className="grid grid-cols-[108px_1fr]">
                    <div className="space-y-1 border-r border-[#eef0f3] p-2 text-[10px] text-[#5e6875]">
                      {["Accueil", "Mes espaces", "Documents", "Discussions", "Signatures", "Collaborateurs"].map((item, index) => (
                        <p key={item} className={index === 2 ? "rounded-md bg-[#eef3ff] px-2 py-1 font-medium text-[#1e4ed8]" : "px-2 py-1"}>{item}</p>
                      ))}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold">Mes documents</p>
                      <div className="mt-2 grid grid-cols-4 gap-1.5">
                        {[["12", "Actifs"], ["4", "Discussion"], ["3", "À valider"], ["7", "Finalisés"]].map(([value, label]) => (
                          <div key={label} className="rounded-lg border border-[#e6e8ee] px-1.5 py-1.5">
                            <p className="text-sm font-semibold text-[#1e4ed8]">{value}</p>
                            <p className="text-[9px] text-[#8b939e]">{label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {documents.map(([title, progress, status]) => (
                          <div key={title} className="flex items-center justify-between gap-2 rounded-lg border border-[#eef0f3] px-2 py-1.5">
                            <span className="truncate text-[10px] font-medium">{title}</span>
                            <span className="text-[10px] text-[#5e6875]">{progress}</span>
                            <span className="rounded-full bg-[#eef3ff] px-1.5 py-0.5 text-[9px] text-[#1e4ed8]">{status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mx-auto mt-1 h-2 w-[92%] rounded-b-xl bg-[#c5ccd6]" />
              </div>
            </div>
          </div>
        </section>

        <Reveal className="relative z-10 -mt-10 px-5 lg:px-8">
          <div {...revealChild(0)} className="mx-auto grid max-w-5xl grid-cols-3 gap-4 rounded-3xl border border-white/10 bg-[#0c1828]/80 px-4 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-md">
            {[
              ["+ 50", "Types de documents"],
              ["+ 20", "Secteurs d'activité"],
              ["100 %", "Sécurisé et conforme"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{value}</p>
                <p className="mt-1 text-sm text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal id="secteurs" className="py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div {...revealChild(0)} className="text-center">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#8eb6ff]">POUR TOUS VOS BESOINS</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Une solution adaptée à chaque secteur</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/65">
                La stratégie change d&apos;un réseau à l&apos;autre. Misterdil ajuste les questions pour rester rapide, que vous soyez en construction, en technologie ou en administration.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {sectors.map((sector, index) => (
                <article key={sector.label} {...revealChild(40 + index * 50)} className="overflow-hidden rounded-2xl bg-white text-[#12151a] shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                  <div className="relative h-28">
                    <Image src={sector.image} alt="" fill className="object-cover" />
                  </div>
                  <div className="flex items-center gap-3 px-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef4ff] text-[#2f7cf6]">
                      <sector.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-5">{sector.label}</span>
                      <span className="block truncate text-xs text-[#6b7280]">{sector.text}</span>
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f3f6fb] text-[#2f7cf6]">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <div id="autres-secteurs" {...revealChild(160)} className="mt-4 flex flex-wrap justify-center gap-2">
              {["Informatique", "Immobilier", "Logistique", "Autre"].map((sector) => (
                <span key={sector} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/75">{sector}</span>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal id="fonctionnement" className="border-y border-white/10 bg-white/[0.025] py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div {...revealChild(0)}>
              <h2 className="text-3xl font-semibold tracking-tight">Comment ça fonctionne</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Un parcours court, pour une collaboration plus rapide entre les parties de votre réseau.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {steps.map((step, index) => (
                <article key={step.title} {...revealChild(90 + index * 90)} className={`${card} p-5`}>
                  <p className="text-sm font-medium text-[#8eb6ff]">0{index + 1}</p>
                  <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal id="types" className="py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div {...revealChild(0)}>
              <h2 className="text-3xl font-semibold tracking-tight">Types de documents</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Le même espace sert aux contrats, aux cahiers des charges, aux chartes et aux accords. Les questions suivent le document, le secteur et la stratégie du projet.</p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {types.map((type, index) => (
                <div key={type} {...revealChild(70 + index * 50)} className={`${card} px-4 py-4 text-sm font-medium`}>{type}</div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal id="fonctionnalites" className="border-y border-white/10 bg-white/[0.025] py-20">
          <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:px-8">
            {[
              { icon: Sparkles, title: "Intelligence artificielle", text: "L'agent analyse, repère les manques et propose des clauses. Il accélère la rédaction. Le modérateur décide." },
              { icon: Users, title: "Collaboration", text: "Chaque commentaire est rattaché à une section. Les propositions gardent l'ancienne et la nouvelle formulation, visibles par tout le réseau." },
              { icon: Check, title: "Validation", text: "Une section peut être en préparation, en discussion, validée ou verrouillée. La progression se calcule toute seule." },
              { icon: PenLine, title: "Signature", text: "Le journal conserve l'identité, la date et l'heure. L'architecture peut accueillir un fournisseur de signature qualifiée." },
            ].map((item, index) => (
              <article key={item.title} {...revealChild(index * 100)} className={`${card} p-6`}>
                <item.icon className="h-5 w-5 text-[#8eb6ff]" />
                <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{item.text}</p>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal id="securite" className="py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 md:flex-row md:items-center md:justify-between lg:px-8">
            <div {...revealChild(0)} className="max-w-xl">
              <Lock className="h-5 w-5 text-[#8eb6ff]" />
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">Sécurité</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">Chaque espace est cloisonné. Un participant ne voit que les documents auxquels il a été invité. Les rôles vont de l&apos;administrateur au lecteur.</p>
            </div>
            <div {...revealChild(140)} className={`${card} p-5 text-sm leading-7 text-white/80`}>
              <p className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#8eb6ff]" /> Historique et versions</p>
              <p className="flex items-center gap-2"><Users className="h-4 w-4 text-[#8eb6ff]" /> Permissions par document</p>
              <p className="flex items-center gap-2"><Lock className="h-4 w-4 text-[#8eb6ff]" /> Sections verrouillables</p>
            </div>
          </div>
        </Reveal>

        <Reveal id="tarifs" className="border-y border-white/10 bg-white/[0.025] py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div {...revealChild(0)}>
              <h2 className="text-3xl font-semibold tracking-tight">Tarifs</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">La démonstration est ouverte. Les offres équipe et organisation se calent ensuite sur votre réseau et votre volume d&apos;ententes.</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["Découverte", "Créez un compte, un espace et une première entente pour voir le parcours complet."],
                ["Équipe", "Collaboration, validation, historique et signature pour un réseau de parties prenantes."],
                ["Organisation", "Stratégie documentaire, permissions et accompagnement pour plusieurs espaces."],
              ].map(([title, text], index) => (
                <article key={title} {...revealChild(80 + index * 100)} className={`${card} p-6 ${index === 1 ? "border-[#2f7cf6]/50 bg-[#12305f]/40" : ""}`}>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
                  <Link href="/inscription" className="mt-5 inline-flex text-sm font-medium text-[#8eb6ff]">Créer un compte</Link>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal id="apropos" className="py-20">
          <div {...revealChild(0)} className="mx-auto max-w-7xl px-5 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight">À propos</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/75">
              Misterdil est la plateforme intelligente pour créer et gérer vos ententes professionnelles. Le slogan tient en une ligne : une Collaboration plus smart. L&apos;objectif est simple : rendre le travail du réseau plus rapide, sans retirer le contrôle humain. L&apos;IA propose. Le modérateur décide. Les parties valident.
            </p>
          </div>
        </Reveal>

        <Reveal id="ressources" className="border-t border-white/10 bg-white/[0.025] py-20">
          <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-3 lg:px-8">
            {[
              ["Parcours", "Les quatre étapes, de la description à la signature.", "#fonctionnement"],
              ["Documents", "Les types d'ententes déjà prêts dans la plateforme.", "#types"],
              ["Sécurité", "Rôles, permissions et journal des modifications.", "#securite"],
            ].map(([title, text, href], index) => (
              <a key={title} href={href} {...revealChild(index * 90)} className={`${card} p-6 transition-colors hover:border-[#8eb6ff]/40`}>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal className="relative overflow-hidden py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(47,124,246,0.22),transparent_60%)]" />
          <div {...revealChild(0)} className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 md:flex-row md:items-center lg:px-8">
            <div>
              <p className="text-sm text-[#8eb6ff]">Une Collaboration plus smart</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Créez vos ententes plus rapidement.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Un espace, une stratégie claire, puis un document que votre réseau peut vraiment terminer.</p>
            </div>
            <Link href="/inscription" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-[#10233f]">
              Créer une entente <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Logo tone="light" stack />
          <span>Créez vos ententes plus rapidement.</span>
        </div>
      </footer>
    </div>
  );
}
