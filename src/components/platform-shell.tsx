"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Bell,
  Bot,
  ClipboardList,
  FileText,
  Folder,
  Home,
  Menu,
  MessageSquare,
  PenLine,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { logout } from "@/server/actions/auth";
import { AssistantPanel } from "@/components/assistant-panel";
import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/espaces", label: "Mes espaces", icon: Folder },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/cahiers", label: "Cahiers des charges", icon: ClipboardList },
  { href: "/discussions", label: "Discussions", icon: MessageSquare },
  { href: "/signatures", label: "Signatures", icon: PenLine },
  { href: "/collaborateurs", label: "Collaborateurs", icon: Users },
  { href: "/activite", label: "Activité", icon: Activity },
  { href: "/assistant", label: "Assistant Misterdil", icon: Bot },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

type Notice = { id: string; title: string; href: string; read: boolean };

function MobileTab({ href, label, icon: Icon, active, dot }: { href: string; label: string; icon: typeof Home; active: boolean; dot?: boolean }) {
  return (
    <Link href={href} className={cn("relative flex flex-col items-center gap-0.5 text-[11px]", active ? "font-medium text-[#2f6fed]" : "text-[#6b7280]")}>
      <Icon className="h-5 w-5" />
      {label}
      {dot ? <span className="absolute right-1/2 top-0 h-2 w-2 translate-x-3 rounded-full bg-[#e11d48]" /> : null}
    </Link>
  );
}

export function PlatformShell({
  user,
  unread,
  notices,
  children,
}: {
  user: { name: string; email: string; organization: string; jobTitle?: string };
  unread: number;
  notices: Notice[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const documentId = pathname.match(/^\/documents\/(?!nouveau)([^/?]+)/)?.[1];

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0b1f4d] text-white">
      <Link href="/accueil" className="flex justify-center px-5 py-5">
        <Logo tone="light" stack />
      </Link>
      <nav className="mt-1 flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/accueil" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm",
                active ? "bg-[#2f6fed] font-medium text-white" : "text-white/75 hover:bg-white/10",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-3">
        <div className="rounded-2xl bg-[#16357a] p-4">
          <p className="text-sm font-semibold">Passez à Misterdil Pro</p>
          <p className="mt-1 text-xs leading-5 text-white/70">Plus de fonctionnalités pour vos équipes.</p>
          <Link href="/#tarifs" className="mt-3 flex h-9 items-center justify-center rounded-full bg-[#2f6fed] text-sm font-medium text-white hover:bg-[#245bd0]">Découvrir</Link>
        </div>
        <button className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-white/10" onClick={() => { setMenu((value) => !value); setAlerts(false); }}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">{initials(user.name)}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-white/60">{user.jobTitle || user.organization || "Membre"}</span>
          </span>
        </button>
        {menu ? (
          <div className="mt-1 rounded-xl bg-[#16357a] p-2 text-sm">
            <p className="px-3 py-2 text-xs text-white/60">{user.email}</p>
            <Link href="/parametres" className="block rounded-lg px-3 py-2 hover:bg-white/10" onClick={() => setMenu(false)}>Paramètres</Link>
            <form action={logout}>
              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Se déconnecter</button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eef3f8]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-[#12151a]/30" onClick={() => setOpen(false)} aria-label="Fermer le menu" />
          <aside className="relative h-full w-72 border-r border-[#e6e8ee]">{sidebar}</aside>
        </div>
      ) : null}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[#e6eef8] bg-[#f7f9fc]/95 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-[#3f4854] hover:bg-white lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" />
          </button>
          <form action="/recherche" className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b939e]" />
            <input name="q" placeholder={documentId ? "Rechercher un document, une section, une personne..." : "Rechercher un document, un espace, une personne..."} className="h-10 w-full rounded-full border border-[#e6e8ee] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2f6fed]" />
          </form>
          <div className="relative">
            <button className="relative rounded-full bg-white p-2 text-[#3f4854] shadow-sm hover:bg-[#f6f7f9]" onClick={() => { setAlerts((value) => !value); setMenu(false); }} aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#e11d48]" /> : null}
            </button>
            {alerts ? (
              <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-[#e6e8ee] bg-white p-2 shadow-lg">
                {notices.length === 0 ? <p className="px-3 py-4 text-sm text-[#5e6875]">Aucune notification.</p> : null}
                {notices.map((notice) => (
                  <Link key={notice.id} href={notice.href || "/notifications"} onClick={() => setAlerts(false)} className="block rounded-lg px-3 py-2 hover:bg-[#f6f7f9]">
                    <p className={cn("text-sm", notice.read ? "text-[#5e6875]" : "font-medium text-[#12151a]")}>{notice.title}</p>
                  </Link>
                ))}
                <Link href="/notifications" className="block px-3 py-2 text-sm text-[#1e4ed8]" onClick={() => setAlerts(false)}>Voir tout</Link>
              </div>
            ) : null}
          </div>
          <span className="hidden items-center gap-1 rounded-full bg-white px-3 py-2 text-sm text-[#3f4854] shadow-sm sm:inline-flex">Français</span>
          {documentId ? (
            <Link href={`/documents/${documentId}?onglet=participants`} className="inline-flex h-10 items-center gap-1 rounded-full bg-[#2f6fed] px-3 text-sm font-medium text-white hover:bg-[#245bd0] sm:px-4">
              Partager
            </Link>
          ) : (
            <Link href="/documents/nouveau" className="hidden h-10 items-center gap-1 rounded-full bg-[#2f6fed] px-3 text-sm font-medium text-white hover:bg-[#245bd0] sm:inline-flex sm:px-4">
              <Plus className="h-4 w-4" />
              Nouvelle entente
            </Link>
          )}
        </header>
        <main className="px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e6eef8] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navigation principale">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          <MobileTab href="/accueil" label="Accueil" icon={Home} active={pathname === "/accueil"} />
          <MobileTab href="/documents" label="Documents" icon={FileText} active={pathname.startsWith("/documents") && !pathname.startsWith("/documents/nouveau")} />
          <Link href="/documents/nouveau" aria-label="Nouvelle entente" className="mx-auto flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-[#2f6fed] text-white shadow-lg shadow-[#2f6fed]/30">
            <Plus className="h-6 w-6" />
          </Link>
          <MobileTab href="/notifications" label="Alertes" icon={Bell} active={pathname === "/notifications"} dot={unread > 0} />
          <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 text-[11px] text-[#6b7280]">
            <Menu className="h-5 w-5" />
            Menu
          </button>
        </div>
      </nav>
      {pathname !== "/accueil" && !documentId ? (
        <>
          <button
            className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-[#1e4ed8] px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-[#173ea8] lg:bottom-5 lg:right-5"
            onClick={() => setAssistant(true)}
          >
            <span aria-hidden>✨</span>
            <span className="hidden sm:inline">Assistant Misterdil</span>
          </button>
          {assistant ? (
            <div className="fixed bottom-36 right-4 z-30 flex max-h-[60vh] w-[min(100vw-2rem,24rem)] flex-col rounded-2xl border border-[#e6e8ee] bg-white p-4 shadow-2xl lg:bottom-20 lg:right-5 lg:max-h-[70vh]">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Assistant Misterdil</p>
                <button onClick={() => setAssistant(false)} aria-label="Fermer l'assistant"><X className="h-4 w-4" /></button>
              </div>
              <AssistantPanel documentId={documentId} compact />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
