"use client";

import { useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarPlus, Check, Mail, Maximize2, Minimize2, MoreHorizontal, Reply, Search, Video, X } from "lucide-react";
import { MICROSOFT_NOTICES as notices, type MailWindow, type MeetingWindow } from "@/lib/microsoft-desk";
import { outlookAction } from "@/server/actions/microsoft";

export function MicrosoftWindows({
  mail,
  meetings,
  connected,
  configured,
  email,
  error,
  notice,
  initialMailId,
  initialMeetingId,
  documentTitles = [],
}: {
  mail: MailWindow[];
  meetings: MeetingWindow[];
  connected: boolean;
  configured: boolean;
  email: string;
  error: string;
  notice?: string;
  initialMailId?: string;
  initialMeetingId?: string;
  documentTitles?: string[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(mail);
  const [openMail, setOpenMail] = useState<MailWindow | null>(mail.find((item) => item.id === initialMailId) ?? null);
  const [openMeeting, setOpenMeeting] = useState<MeetingWindow | null>(meetings.find((item) => item.id === initialMeetingId) ?? null);
  const [expanded, setExpanded] = useState<"outlook" | "teams" | null>(initialMailId ? "outlook" : initialMeetingId ? "teams" : null);
  const [mailLarge, setMailLarge] = useState(Boolean(initialMailId));
  const [meetingLarge, setMeetingLarge] = useState(Boolean(initialMeetingId));
  const [menuId, setMenuId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  const [mailTab, setMailTab] = useState<"tous" | "nonlus" | "importants" | "lies">("tous");
  const [mailQuery, setMailQuery] = useState("");
  const [meetTab, setMeetTab] = useState<"prochaines" | "passees" | "enregistrements">("prochaines");
  const banner = notice && notice !== "ok" ? notices[notice] ?? "" : "";
  const titles = documentTitles.map((title) => title.toLowerCase()).filter((title) => title.length > 4);
  const visibleMail = items.filter((item) => {
    const blob = `${item.subject} ${item.preview} ${item.from}`.toLowerCase();
    if (mailQuery.trim() && !blob.includes(mailQuery.trim().toLowerCase())) return false;
    if (mailTab === "nonlus") return item.unread;
    if (mailTab === "importants") return item.important;
    if (mailTab === "lies") return titles.some((title) => blob.includes(title));
    return true;
  });
  const upcoming = meetings.filter((item) => !item.past);
  const pastMeetings = meetings.filter((item) => item.past);
  const shownMeetings = meetTab === "passees" ? pastMeetings : meetTab === "prochaines" ? upcoming : [];

  function run(messageId: string, action: "read" | "archive" | "reply", comment?: string) {
    setFeedback("");
    startTransition(async () => {
      const result = await outlookAction(messageId, action, comment);
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      if (action === "read") {
        setItems((current) => current.map((item) => (item.id === messageId ? { ...item, unread: false } : item)));
        setOpenMail((current) => (current?.id === messageId ? { ...current, unread: false } : current));
      }
      if (action === "archive") {
        setItems((current) => current.filter((item) => item.id !== messageId));
        setOpenMail((current) => (current?.id === messageId ? null : current));
      }
      if (action === "reply") {
        setReply("");
        setFeedback("Réponse envoyée.");
      }
      setMenuId(null);
      router.refresh();
    });
  }

  return (
    <>
      {notice === "ok" && connected ? <p className="text-sm text-[#14804a]">{notices.ok}</p> : null}
      {banner ? <p className="text-sm text-[#9f2d2d]">{banner}</p> : null}
      <div className="flex flex-wrap items-start gap-4">
        <section className="relative flex min-h-[280px] w-full min-w-[300px] flex-col overflow-hidden rounded-2xl border border-[#d7e4f5] bg-white shadow-md xl:w-[calc(50%-0.5rem)]">
          <DeskHeader tint="from-[#0f6cbd] to-[#3aa0f5]" icon={<Mail className="h-4 w-4" />} title="Outlook" subtitle="Vos courriels récents et importants" onExpand={() => setExpanded("outlook")}>
            {connected ? (
              <>
                <span className="hidden truncate text-[11px] text-white/80 sm:inline">{email}</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">Connecté</span>
                <a href="https://outlook.office.com/mail/" target="_blank" rel="noreferrer" className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#0f6cbd]">Ouvrir Outlook</a>
              </>
            ) : null}
          </DeskHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
          <ConnectState connected={connected} configured={configured} message={error} empty={false} emptyLabel="">
            <MailToolbar tab={mailTab} setTab={setMailTab} query={mailQuery} setQuery={setMailQuery} unread={items.filter((item) => item.unread).length} important={items.filter((item) => item.important).length} />
            {visibleMail.length === 0 ? <p className="px-3 py-6 text-sm text-[#6b7280]">Aucun courriel dans cette vue.</p> : null}
            {visibleMail.map((item) => (
              <div key={item.id} className="flex items-start gap-2 border-t border-[#f2f5f9] px-3 py-3 hover:bg-[#f7fbff]">
                <button type="button" onClick={() => { setOpenMail(item); setMailLarge(false); }} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                  <Avatar name={item.from} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`truncate text-sm ${item.unread ? "font-semibold text-[#10233f]" : "text-[#243040]"}`}>{item.from}</span>
                      {item.category ? <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-[10px] font-medium text-[#2f6fed]">{item.category}</span> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-[#10233f]">{item.subject}</span>
                    <span className="block truncate text-xs text-[#8b939e]">{item.preview}</span>
                  </span>
                </button>
                <span className="shrink-0 pt-0.5 text-[11px] text-[#8b939e]">{item.clock}</span>
                <MailMenu
                  open={menuId === item.id}
                  onToggle={() => setMenuId(menuId === item.id ? null : item.id)}
                  onRead={() => run(item.id, "read")}
                  onArchive={() => run(item.id, "archive")}
                  onReply={() => { setOpenMail(item); setMailLarge(true); setMenuId(null); }}
                />
              </div>
            ))}
          </ConnectState>
          </div>
          <ResizeGrip />
        </section>

        <section className="relative flex min-h-[280px] w-full min-w-[300px] flex-col overflow-hidden rounded-2xl border border-[#dddff5] bg-white shadow-md xl:w-[calc(50%-0.5rem)]">
          <DeskHeader tint="from-[#5b5fc7] to-[#7b83eb]" icon={<Video className="h-4 w-4" />} title="Teams" subtitle="Vos réunions et activités d'équipe" onExpand={() => setExpanded("teams")}>
            {connected ? <a href="https://teams.microsoft.com/" target="_blank" rel="noreferrer" className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#5b5fc7]">Ouvrir Teams</a> : null}
          </DeskHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
          <ConnectState connected={connected} configured={configured} message={error} empty={false} emptyLabel="">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f2f5f9] px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {([
                  ["prochaines", "Prochaines réunions"],
                  ["passees", "Réunions passées"],
                  ["enregistrements", "Enregistrements"],
                ] as const).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setMeetTab(id)} className={meetTab === id ? "rounded-full bg-[#eef0ff] px-3 py-1 text-xs font-medium text-[#5b5fc7]" : "rounded-full px-3 py-1 text-xs text-[#5e6875]"}>
                    {label}
                  </button>
                ))}
              </div>
              <a href="https://outlook.office.com/calendar/deeplink/compose" target="_blank" rel="noreferrer" className="text-xs font-medium text-[#5b5fc7]">+ Nouvelle réunion</a>
            </div>
            {meetTab === "enregistrements" ? <p className="px-4 py-6 text-sm text-[#6b7280]">Les enregistrements Teams apparaîtront ici lorsqu'ils seront disponibles sur votre compte.</p> : null}
            {meetTab !== "enregistrements" && shownMeetings.length === 0 ? <p className="px-4 py-6 text-sm text-[#6b7280]">{meetTab === "passees" ? "Aucune réunion passée cette semaine." : "Aucune réunion Teams à venir."}</p> : null}
            {shownMeetings.map((item) => {
              const linked = documentTitles.find((title) => title.length > 4 && item.subject.toLowerCase().includes(title.toLowerCase()));
              return (
                <div key={item.id} className="flex flex-wrap items-center gap-3 border-t border-[#f2f5f9] px-3 py-3">
                  <button type="button" onClick={() => { setOpenMeeting(item); setMeetingLarge(false); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="w-16 shrink-0 text-center">
                      <span className="block text-[11px] font-medium text-[#5b5fc7]">{item.day}</span>
                      <span className="block text-sm font-semibold text-[#10233f]">{item.time}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#10233f]">{item.subject}</span>
                      <span className="block truncate text-xs text-[#6b7280]">{item.organizer || "Réunion Teams"}{item.attendees > 0 ? ` · ${item.attendees} participant${item.attendees > 1 ? "s" : ""}` : ""}</span>
                    </span>
                  </button>
                  {linked ? <span className="hidden rounded-lg bg-[#f4f7fb] px-2 py-1 text-[11px] text-[#3f4854] sm:inline">{linked}</span> : null}
                  {item.joinUrl && !item.past ? <a href={item.joinUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-lg bg-[#5b5fc7] px-3 text-xs font-medium text-white">Rejoindre</a> : null}
                </div>
              );
            })}
            {meetTab === "prochaines" ? (
              <div className="flex items-center justify-between gap-3 bg-[#f7f6ff] px-4 py-3 text-sm text-[#5e6875]">
                <span>{upcoming.length === 0 ? "Aucune réunion cette semaine." : "Vos prochaines réunions s'affichent ici."}</span>
                <a href="https://outlook.office.com/calendar/deeplink/compose" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-[#5b5fc7]"><CalendarPlus className="h-3.5 w-3.5" />Planifier une réunion</a>
              </div>
            ) : null}
          </ConnectState>
          </div>
          <ResizeGrip />
        </section>
      </div>

      {expanded === "outlook" ? (
        <LargeDesk title="Outlook" tint="bg-[#0f6cbd]" onClose={() => setExpanded(null)}>
          <div className="grid min-h-[24rem] md:grid-cols-[260px_minmax(0,1fr)]">
            <div className="max-h-[70vh] overflow-y-auto border-b border-[#eef2f7] md:border-b-0 md:border-r">
              {visibleMail.map((item) => (
                <button key={item.id} type="button" onClick={() => setOpenMail(item)} className={`flex w-full items-start gap-2 px-3 py-3 text-left ${openMail?.id === item.id ? "bg-[#e8f3ff]" : "hover:bg-[#f4f7fb]"}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.unread ? "bg-[#0f6cbd]" : "bg-transparent"}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[#10233f]">{item.subject}</span>
                    <span className="block truncate text-xs text-[#6b7280]">{item.from}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {openMail ? <MailReader item={openMail} reply={reply} setReply={setReply} feedback={feedback} pending={pending} onRead={() => run(openMail.id, "read")} onArchive={() => run(openMail.id, "archive")} onReply={() => run(openMail.id, "reply", reply)} /> : <p className="text-sm text-[#6b7280]">Choisissez un courriel.</p>}
            </div>
          </div>
        </LargeDesk>
      ) : null}

      {expanded === "teams" ? (
        <LargeDesk title="Teams" tint="bg-[#5b5fc7]" onClose={() => setExpanded(null)}>
          <div className="grid min-h-[24rem] md:grid-cols-[260px_minmax(0,1fr)]">
            <div className="max-h-[70vh] overflow-y-auto border-b border-[#eef2f7] md:border-b-0 md:border-r">
              {(meetTab === "enregistrements" ? [] : shownMeetings).map((item) => (
                <button key={item.id} type="button" onClick={() => setOpenMeeting(item)} className={`block w-full px-3 py-3 text-left ${openMeeting?.id === item.id ? "bg-[#eef0ff]" : "hover:bg-[#f4f7fb]"}`}>
                  <span className="block truncate text-sm font-medium text-[#10233f]">{item.subject}</span>
                  <span className="block truncate text-xs text-[#6b7280]">{item.when}</span>
                </button>
              ))}
            </div>
            <div className="p-4">
              {openMeeting ? <MeetingReader item={openMeeting} /> : <p className="text-sm text-[#6b7280]">Choisissez une réunion.</p>}
            </div>
          </div>
        </LargeDesk>
      ) : null}

      {openMail && expanded !== "outlook" ? (
        <FloatingWindow title={openMail.subject} tint="bg-[#0f6cbd]" large={mailLarge} onToggle={() => setMailLarge((value) => !value)} onClose={() => setOpenMail(null)} className="right-4 sm:right-6">
          <MailReader item={openMail} reply={reply} setReply={setReply} feedback={feedback} pending={pending} onRead={() => run(openMail.id, "read")} onArchive={() => run(openMail.id, "archive")} onReply={() => run(openMail.id, "reply", reply)} />
        </FloatingWindow>
      ) : null}
      {openMeeting && expanded !== "teams" ? (
        <FloatingWindow title={openMeeting.subject} tint="bg-[#5b5fc7]" large={meetingLarge} onToggle={() => setMeetingLarge((value) => !value)} onClose={() => setOpenMeeting(null)} className={openMail && expanded !== "outlook" ? "bottom-[28rem] right-4 sm:right-6" : "right-4 sm:right-6"}>
          <MeetingReader item={openMeeting} />
        </FloatingWindow>
      ) : null}
    </>
  );
}

function MailMenu({
  open,
  onToggle,
  onRead,
  onArchive,
  onReply,
}: {
  open: boolean;
  onToggle: () => void;
  onRead: () => void;
  onArchive: () => void;
  onReply: () => void;
}) {
  return (
    <div className="relative">
      <button type="button" onClick={onToggle} aria-label="Actions du message" className="mt-1 rounded-full p-1.5 text-[#6b7280] hover:bg-white">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-10 w-44 rounded-xl border border-[#e6eef8] bg-white p-1 text-sm shadow-lg">
          <button type="button" onClick={onReply} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#f4f7fb]"><Reply className="h-3.5 w-3.5" />Répondre</button>
          <button type="button" onClick={onRead} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#f4f7fb]"><Check className="h-3.5 w-3.5" />Marquer comme lu</button>
          <button type="button" onClick={onArchive} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#f4f7fb]"><Archive className="h-3.5 w-3.5" />Archiver</button>
        </div>
      ) : null}
    </div>
  );
}

function MailReader({
  item,
  reply,
  setReply,
  feedback,
  pending,
  onRead,
  onArchive,
  onReply,
}: {
  item: MailWindow;
  reply: string;
  setReply: (value: string) => void;
  feedback: string;
  pending: boolean;
  onRead: () => void;
  onArchive: () => void;
  onReply: () => void;
}) {
  return (
    <div>
      <p className="text-xs text-[#6b7280]">{item.from} · {item.receivedAt}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onRead} className="inline-flex h-8 items-center gap-1 rounded-full border border-[#e6eef8] px-3 text-xs font-medium text-[#243040]"><Check className="h-3.5 w-3.5" />Lu</button>
        <button type="button" onClick={onArchive} className="inline-flex h-8 items-center gap-1 rounded-full border border-[#e6eef8] px-3 text-xs font-medium text-[#243040]"><Archive className="h-3.5 w-3.5" />Archiver</button>
      </div>
      <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-[#243040]">{item.body || item.preview}</div>
      <label className="mt-4 block text-xs font-medium text-[#3f4854]">Répondre</label>
      <textarea value={reply} onChange={(event) => setReply(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-[#e6eef8] px-3 py-2 text-sm outline-none focus:border-[#0f6cbd]" placeholder="Votre réponse" />
      <button type="button" disabled={pending} onClick={onReply} className="mt-2 inline-flex h-9 items-center gap-1 rounded-full bg-[#0f6cbd] px-4 text-sm font-medium text-white disabled:opacity-60">
        <Reply className="h-3.5 w-3.5" />
        {pending ? "Envoi..." : "Envoyer"}
      </button>
      {feedback ? <p className="mt-2 text-xs text-[#3f4854]">{feedback}</p> : null}
    </div>
  );
}

function MeetingReader({ item }: { item: MeetingWindow }) {
  return (
    <div>
      <p className="text-sm text-[#243040]">{item.when}</p>
      {item.organizer ? <p className="mt-1 text-xs text-[#6b7280]">Organisé par {item.organizer}</p> : null}
      <p className="mt-3 text-sm leading-5 text-[#5e6875]">Le détail de la rencontre reste dans Misterdil. Le bouton ouvre Teams seulement pour rejoindre l'appel.</p>
      {item.joinUrl ? (
        <a href={item.joinUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center rounded-full bg-[#5b5fc7] px-4 text-sm font-medium text-white">Rejoindre dans Teams</a>
      ) : (
        <p className="mt-4 text-sm text-[#6b7280]">Le lien de la réunion n'est pas encore disponible.</p>
      )}
    </div>
  );
}

function DeskHeader({
  tint,
  icon,
  title,
  subtitle,
  onExpand,
  children,
}: {
  tint: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onExpand: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r ${tint} px-4 py-3 text-white`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">{icon}</span>
        <span>
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-[11px] text-white/80">{subtitle}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        {children}
        <button type="button" onClick={onExpand} aria-label={`Agrandir ${title}`} className="rounded-full p-1.5 hover:bg-white/15">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MailToolbar({
  tab,
  setTab,
  query,
  setQuery,
  unread,
  important,
}: {
  tab: "tous" | "nonlus" | "importants" | "lies";
  setTab: (value: "tous" | "nonlus" | "importants" | "lies") => void;
  query: string;
  setQuery: (value: string) => void;
  unread: number;
  important: number;
}) {
  const tabs = [
    ["tous", "Tous"],
    ["nonlus", `Non lus${unread ? ` ${unread}` : ""}`],
    ["importants", `Importants${important ? ` ${important}` : ""}`],
    ["lies", "Liés aux ententes"],
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <div className="flex flex-wrap gap-1">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={tab === id ? "rounded-full bg-[#e8f3ff] px-3 py-1 text-xs font-medium text-[#0f6cbd]" : "rounded-full px-3 py-1 text-xs text-[#5e6875]"}>
            {label}
          </button>
        ))}
      </div>
      <span className="relative ml-auto min-w-40 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b939e]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un courriel..." className="h-8 w-full rounded-full border border-[#e6eef8] pl-8 pr-3 text-xs outline-none focus:border-[#0f6cbd]" />
      </span>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f3ff] text-sm font-semibold text-[#0f6cbd]">{letter}</span>;
}

function LargeDesk({
  title,
  tint,
  onClose,
  children,
}: {
  title: string;
  tint: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="fixed inset-x-3 top-20 z-40 flex h-[70vh] min-h-[280px] min-w-[320px] flex-col overflow-hidden rounded-2xl border border-[#d7e0ee] bg-white shadow-2xl sm:inset-x-8 lg:inset-x-24">
      <div className={`flex h-11 shrink-0 items-center gap-2 px-3 text-white ${tint}`}>
        <p className="min-w-0 flex-1 text-sm font-medium">{title}</p>
        <button type="button" onClick={onClose} aria-label={`Réduire ${title}`} className="rounded-full p-1 hover:bg-white/15">
          <Minimize2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={onClose} aria-label={`Fermer ${title}`} className="rounded-full p-1 hover:bg-white/15">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      <ResizeGrip />
    </section>
  );
}

function FloatingWindow({
  title,
  tint,
  large,
  onToggle,
  onClose,
  className,
  children,
}: {
  title: string;
  tint: string;
  large: boolean;
  onToggle: () => void;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`fixed z-40 flex min-h-[220px] min-w-[280px] flex-col overflow-hidden rounded-2xl border border-[#d7e0ee] bg-white shadow-2xl ${large ? "inset-x-3 top-20 h-[70vh] sm:inset-x-10 lg:inset-x-28" : `bottom-6 h-[28rem] w-[min(100vw-2rem,26rem)] ${className ?? ""}`}`}>
      <div className={`flex h-10 shrink-0 items-center gap-2 px-3 text-white ${tint}`}>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
        <button type="button" onClick={onToggle} aria-label={large ? "Réduire la fenêtre" : "Agrandir la fenêtre"} className="rounded-full p-1 hover:bg-white/15">
          {large ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onClose} aria-label="Fermer la fenêtre" className="rounded-full p-1 hover:bg-white/15">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      <ResizeGrip />
    </section>
  );
}

function ResizeGrip() {
  function start(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const shell = event.currentTarget.parentElement;
    if (!shell) return;
    const rect = shell.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const fixed = getComputedStyle(shell).position === "fixed";
    const move = (ev: PointerEvent) => {
      const width = Math.min(window.innerWidth - 16, Math.max(300, rect.width + ev.clientX - startX));
      const height = Math.min(window.innerHeight - 16, Math.max(220, rect.height + ev.clientY - startY));
      shell.style.width = `${width}px`;
      shell.style.height = `${height}px`;
      shell.style.maxWidth = "none";
      if (fixed) {
        shell.style.left = `${rect.left}px`;
        shell.style.top = `${rect.top}px`;
        shell.style.right = "auto";
        shell.style.bottom = "auto";
        shell.style.inset = "auto";
      }
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  return (
    <button
      type="button"
      aria-label="Redimensionner la fenêtre"
      onPointerDown={start}
      className="absolute bottom-0 right-0 z-20 h-5 w-5 cursor-nwse-resize touch-none"
    >
      <span className="absolute bottom-1 right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-[#8b939e]" />
    </button>
  );
}

function ConnectState({
  connected,
  configured,
  message,
  empty,
  emptyLabel,
  children,
}: {
  connected: boolean;
  configured: boolean;
  message: string;
  empty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  if (!configured) return <p className="px-2 py-4 text-sm text-[#6b7280]">Ajoutez les clés Microsoft pour afficher cette fenêtre.</p>;
  if (!connected) {
    return (
      <div className="px-2 py-4 text-sm text-[#3f4854]">
        <p>{message || "Connectez Microsoft pour lire vos courriels et voir vos réunions sans quitter Misterdil."}</p>
        <a href="/api/auth/microsoft" className="mt-3 inline-flex h-9 items-center rounded-full bg-[#10233f] px-3 text-xs font-medium text-white">Connecter Microsoft</a>
      </div>
    );
  }
  return (
    <>
      {message && message !== notices.ok ? <p className="px-2 py-2 text-xs text-[#9f2d2d]">{message}</p> : null}
      {empty && !message ? <p className="px-2 py-4 text-sm text-[#6b7280]">{emptyLabel}</p> : null}
      {children}
    </>
  );
}
