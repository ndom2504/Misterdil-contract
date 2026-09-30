"use client";

import dynamic from "next/dynamic";
import { Download, FileText, Loader2, MoreVertical, Paperclip, Phone, PhoneCall, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CallCredentials } from "@/components/call-panel";
import { MenuActions, type MenuAction } from "@/components/color-picker";
import { Card } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { playChime } from "@/lib/chime";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { REACTIONS } from "@/lib/palette";
import { formatSize, uploadDirect } from "@/lib/upload";

const CallPanel = dynamic(() => import("@/components/call-panel"), { ssr: false });

type ChatFile = { name: string; type: string; size: number; url: string };
type ChatMessage = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorAvatar: string;
  body: string;
  kind: string;
  file?: ChatFile | null;
  createdAt: string;
};
type CallStatus = { configured: boolean; active: boolean; participants: { id: string; name: string }[] };
type Reaction = { emoji: string; count: number; userIds: string[]; names: string[] };
type Reactions = Record<string, Reaction[]>;
type Reply = { messages: ChatMessage[]; reactions?: Reactions; call: CallStatus; clearedAt?: string | null; canManage?: boolean };

const POLL_MS = 3000;
const MAX_FILE = 25 * 1024 * 1024;
const INLINE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.heic,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";

function receivedCount(reactions: Reactions, messages: ChatMessage[], userId: string) {
  const mine = new Set(messages.filter((item) => item.authorId === userId).map((item) => item.id));
  let total = 0;
  for (const [messageId, list] of Object.entries(reactions)) {
    if (!mine.has(messageId)) continue;
    for (const entry of list) total += entry.userIds.filter((id) => id !== userId).length;
  }
  return total;
}

function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  const known = new Set(current.map((item) => item.id));
  const added = incoming.filter((item) => !known.has(item.id));
  return added.length ? [...current, ...added] : current;
}

// A CLEAR message means everything before it was deleted for everyone; clearedAt is the user's own clear.
function visible(list: ChatMessage[], cleared: string | null) {
  let start = 0;
  list.forEach((item, index) => {
    if (item.kind === "CLEAR") start = index;
  });
  const kept = list.slice(start).filter((item) => !cleared || item.createdAt > cleared);
  return kept.length === list.length ? list : kept;
}

function isSystem(item: ChatMessage) {
  return item.kind === "CALL" || item.kind === "CLEAR";
}

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "Une erreur est survenue.";
}

function Attachment({ file, mine }: { file: ChatFile; mine: boolean }) {
  if (INLINE.has(file.type)) {
    return (
      <a href={`${file.url}?inline=1`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- private, cookie-authenticated file */}
        <img src={`${file.url}?inline=1`} alt={file.name} className="max-h-64 max-w-full object-cover" loading="lazy" />
      </a>
    );
  }
  return (
    <a
      href={file.url}
      className={cn(
        "flex min-w-56 items-center gap-3 rounded-xl px-3 py-2",
        mine ? "bg-white/15 hover:bg-white/25" : "border border-[#e6eef8] bg-white hover:bg-[#f5f7fb]",
      )}
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", mine ? "bg-white/20" : "bg-[#e8f0ff] text-[#2f6fed]")}>
        <FileText className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{file.name}</span>
        <span className={cn("block text-[11px]", mine ? "text-white/75" : "text-[#8b939e]")}>{formatSize(file.size)}</span>
      </span>
      <Download className="h-4 w-4 shrink-0 opacity-70" />
    </a>
  );
}

export function EntenteChat({ documentId, currentUserId, callInvite }: { documentId: string; currentUserId: string; callInvite: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [call, setCall] = useState<CallStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<CallCredentials | null>(null);
  const [joining, setJoining] = useState(false);
  const [reactions, setReactions] = useState<Reactions>({});
  const [canManage, setCanManage] = useState(false);
  const [menu, setMenu] = useState(false);
  const [dragging, setDragging] = useState(false);
  const cursor = useRef<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const known = useRef<ChatMessage[]>([]);
  const cleared = useRef<string | null>(null);
  const received = useRef<number | null>(null);
  const pendingReaction = useRef(0);

  const apply = useCallback((incoming: ChatMessage[]) => {
    known.current = visible(merge(known.current, incoming), cleared.current);
    setMessages(known.current);
  }, []);

  const load = useCallback(async () => {
    const after = cursor.current ? `?after=${encodeURIComponent(cursor.current)}` : "";
    const response = await fetch(`/api/documents/${documentId}/messages${after}`, { cache: "no-store" });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = (await response.json()) as Reply;
    cleared.current = data.clearedAt ?? null;
    setCanManage(Boolean(data.canManage));
    apply(data.messages);
    setCall(data.call);
    if (data.reactions && !pendingReaction.current) {
      const total = receivedCount(data.reactions, known.current, currentUserId);
      if (received.current !== null && total > received.current) playChime();
      received.current = total;
      setReactions(data.reactions);
    }
    const last = data.messages[data.messages.length - 1];
    if (last) cursor.current = last.createdAt;
    setError("");
  }, [documentId, currentUserId, apply]);

  async function react(messageId: string, emoji: string) {
    const before = reactions[messageId] ?? [];
    const entry = before.find((item) => item.emoji === emoji);
    const adding = !entry?.userIds.includes(currentUserId);
    if (adding) playChime();
    const optimistic = adding
      ? entry
        ? before.map((item) => (item.emoji === emoji ? { ...item, count: item.count + 1, userIds: [...item.userIds, currentUserId], names: [...item.names, "Vous"] } : item))
        : [...before, { emoji, count: 1, userIds: [currentUserId], names: ["Vous"] }]
      : before
          .map((item) => (item.emoji === emoji ? { ...item, count: item.count - 1, userIds: item.userIds.filter((id) => id !== currentUserId) } : item))
          .filter((item) => item.count > 0);
    setReactions((current) => ({ ...current, [messageId]: optimistic }));
    pendingReaction.current += 1;
    try {
      const response = await fetch(`/api/documents/${documentId}/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { reactions: Reaction[] };
      setReactions((current) => ({ ...current, [messageId]: data.reactions }));
    } catch (reason) {
      setReactions((current) => ({ ...current, [messageId]: before }));
      setError(reason instanceof Error ? reason.message : "Réaction impossible.");
    } finally {
      pendingReaction.current -= 1;
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const count = messages?.length ?? 0;
  useEffect(() => {
    const element = list.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [count]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const response = await fetch(`/api/documents/${documentId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (response.ok) {
      const data = (await response.json()) as { message: ChatMessage };
      apply([data.message]);
      setDraft("");
      setError("");
    } else {
      setError(await readError(response));
    }
    setSending(false);
  }

  async function sendFile(file: File) {
    if (uploading) return;
    if (file.size > MAX_FILE) {
      setError("Fichier trop volumineux (25 Mo maximum).");
      return;
    }
    setUploading(file.name);
    setError("");
    const caption = draft.trim();
    try {
      const pathname = await uploadDirect(file, file.name, { purpose: "chat", documentId });
      let response: Response;
      if (pathname) {
        response = await fetch(`/api/documents/${documentId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: caption, upload: { pathname, name: file.name } }),
        });
      } else {
        const form = new FormData();
        form.append("body", caption);
        form.append("file", file);
        response = await fetch(`/api/documents/${documentId}/messages`, { method: "POST", body: form });
      }
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { message: ChatMessage };
      apply([data.message]);
      if (caption) setDraft("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Le fichier n'a pas pu être envoyé.");
    } finally {
      setUploading("");
    }
  }

  async function clearHistory(scope: "me" | "all") {
    const question =
      scope === "all"
        ? "Supprimer tout l'historique pour toutes les parties ?\n\nLes messages et les fichiers partagés seront définitivement effacés."
        : "Effacer l'historique de cette discussion pour vous ?\n\nLes autres parties conservent leurs messages.";
    if (!window.confirm(question)) return;
    const response = await fetch(`/api/documents/${documentId}/messages/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    if (scope === "me") {
      cleared.current = new Date().toISOString();
      known.current = [];
      setMessages([]);
    }
    await load();
  }

  async function join() {
    setJoining(true);
    const response = await fetch(`/api/documents/${documentId}/call`, { method: "POST" });
    if (response.ok) {
      const data = (await response.json()) as CallCredentials;
      setCredentials({ url: data.url, token: data.token });
      setError("");
    } else {
      setError(await readError(response));
    }
    setJoining(false);
  }

  const callers = call?.participants.length ?? 0;
  const historyActions: MenuAction[] = [
    { label: "Effacer pour moi", hint: "Les autres parties gardent leurs messages", onSelect: () => void clearHistory("me") },
    ...(canManage
      ? [{ label: "Supprimer pour tous", hint: "Messages et fichiers effacés pour toutes les parties", destructive: true, onSelect: () => void clearHistory("all") }]
      : []),
  ];

  return (
    <div className="space-y-4">
      {credentials ? (
        <CallPanel
          credentials={credentials}
          onLeave={() => {
            setCredentials(null);
            void load();
          }}
        />
      ) : call?.configured ? (
        <Card className={cn("flex flex-wrap items-center justify-between gap-3 p-4", call.active || callInvite ? "border-[#b7e4c7] bg-[#f0fbf4]" : "")}>
          <div className="flex items-center gap-3">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", call.active ? "bg-[#16a34a] text-white" : "bg-[#e8f0ff] text-[#2f6fed]")}>
              {call.active ? <PhoneCall className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-sm font-medium text-[#10233f]">
                {call.active ? `Appel en cours · ${callers} participant${callers > 1 ? "s" : ""}` : "Appel audio avec les parties prenantes"}
              </p>
              <p className="text-xs text-[#6b7280]">
                {call.active ? call.participants.map((item) => item.name).join(", ") : "Toutes les parties de l'entente sont notifiées quand l'appel commence."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={join}
            disabled={joining}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#16a34a] px-4 text-sm font-medium text-white hover:bg-[#15803d] disabled:opacity-60">
            <Phone className="h-4 w-4" />
            {joining ? "Connexion…" : call.active ? "Rejoindre l'appel" : "Lancer l'appel"}
          </button>
        </Card>
      ) : null}

      <div
        className={cn("rounded-xl", dragging && "ring-2 ring-[#2f6fed]")}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void sendFile(file);
        }}>
      <Card className="flex flex-col p-0">
        <div className="flex items-start justify-between gap-3 border-b border-[#eef2f7] px-5 py-4">
          <div>
            <h2 className="font-semibold text-[#10233f]">Discussion de l&apos;entente</h2>
            <p className="text-xs text-[#8b939e]">Visible par toutes les parties prenantes de l&apos;entente. Glissez un fichier ici pour le partager.</p>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-label="Réglages de la discussion"
              aria-expanded={menu}
              onClick={() => setMenu((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#5e6875] hover:bg-[#f5f7fb]">
              <MoreVertical className="h-4 w-4" />
            </button>
            {menu ? (
              <>
                <button type="button" aria-label="Fermer" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenu(false)} />
                <div className="absolute right-0 z-30 mt-1 w-72 rounded-2xl border border-[#e6eef8] bg-white p-2 shadow-lg">
                  <p className="px-2 pb-1 text-xs font-semibold text-[#8b939e]">Historique de la discussion</p>
                  <MenuActions actions={historyActions} onDone={() => setMenu(false)} />
                  {!canManage ? <p className="px-2 pt-1 text-[11px] text-[#8b939e]">Seul le modérateur peut supprimer l&apos;historique pour tous.</p> : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div ref={list} className="h-[460px] space-y-2 overflow-y-auto px-5 py-4">
          {messages === null ? (
            <p className="text-sm text-[#8b939e]">Chargement…</p>
          ) : messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#8b939e]">Aucun message. Écrivez aux parties prenantes de cette entente.</p>
          ) : (
            messages.map((item, index) => {
              if (isSystem(item)) {
                const Icon = item.kind === "CLEAR" ? Trash2 : Phone;
                return (
                  <p key={item.id} className="flex items-center justify-center gap-2 py-1 text-xs text-[#6b7280]">
                    <Icon className="h-3.5 w-3.5" />
                    {item.body} · {formatDateTime(item.createdAt)}
                  </p>
                );
              }
              const mine = item.authorId === currentUserId;
              const previous = messages[index - 1];
              const first = !previous || previous.authorId !== item.authorId || isSystem(previous);
              const chips = reactions[item.id] ?? [];
              return (
                <div key={item.id} className={cn("group flex items-end gap-2", mine && "justify-end", first && "pt-2")}>
                  {!mine ? <div className="w-8">{first ? <UserAvatar name={item.authorName} url={item.authorAvatar} size={32} /> : null}</div> : null}
                  <div className={cn("relative flex max-w-[75%] flex-col", mine ? "items-end" : "items-start")}>
                    <div className={cn("rounded-2xl px-3.5 py-2", mine ? "rounded-br-md bg-[#2f6fed] text-white" : "rounded-bl-md border border-[#eef2f7] bg-[#f7f8fb] text-[#10233f]")}>
                      {!mine && first ? <p className="text-xs font-semibold text-[#2f6fed]">{item.authorName}</p> : null}
                      {item.file ? <div className="my-1"><Attachment file={item.file} mine={mine} /></div> : null}
                      {item.body ? <p className="text-sm leading-6 whitespace-pre-wrap">{item.body}</p> : null}
                      <p className={cn("text-right text-[11px]", mine ? "text-white/75" : "text-[#8b939e]")}>{formatDateTime(item.createdAt)}</p>
                    </div>
                    <div
                      className={cn(
                        "absolute -top-4 z-10 hidden items-center gap-0.5 rounded-full border border-[#e6eef8] bg-white px-1 py-0.5 shadow-md group-hover:flex group-focus-within:flex",
                        mine ? "right-2" : "left-2",
                      )}
                    >
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          aria-label={`Réagir ${emoji}`}
                          onClick={() => void react(item.id, emoji)}
                          className="rounded-full px-1 text-base leading-7 transition hover:scale-125">
                          {emoji}
                        </button>
                      ))}
                    </div>
                    {chips.length ? (
                      <div className="-mt-1.5 flex flex-wrap gap-1 px-2">
                        {chips.map((entry) => {
                          const selected = entry.userIds.includes(currentUserId);
                          return (
                            <button
                              key={entry.emoji}
                              type="button"
                              title={entry.names.join(", ")}
                              onClick={() => void react(item.id, entry.emoji)}
                              className={cn(
                                "inline-flex items-center gap-0.5 rounded-full border px-1.5 text-xs leading-5 shadow-sm",
                                selected ? "border-[#2f6fed] bg-[#e8f0ff] text-[#2f6fed]" : "border-[#e6eef8] bg-white text-[#5e6875]",
                              )}>
                              <span>{entry.emoji}</span>
                              {entry.count > 1 ? <span className="font-semibold">{entry.count}</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {uploading ? (
          <p className="flex items-center gap-2 px-5 pb-2 text-sm text-[#2f6fed]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Envoi de « {uploading} »…
          </p>
        ) : null}
        {error ? <p className="px-5 pb-2 text-sm text-[#9f2d2d]">{error}</p> : null}
        <form
          className="flex items-end gap-2 border-t border-[#eef2f7] px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}>
          <input
            ref={picker}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void sendFile(file);
            }}
          />
          <button
            type="button"
            aria-label="Joindre un fichier"
            title="Joindre une photo ou un document (25 Mo max.) — le texte saisi sert de légende"
            disabled={Boolean(uploading)}
            onClick={() => picker.current?.click()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e6eef8] text-[#5e6875] hover:bg-[#f5f7fb] disabled:opacity-45">
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            onPaste={(event) => {
              const file = event.clipboardData.files[0];
              if (file) {
                event.preventDefault();
                void sendFile(file);
              }
            }}
            maxLength={2000}
            rows={1}
            placeholder="Votre message (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-[#e6eef8] bg-[#f7f8fb] px-4 py-2.5 text-sm outline-none focus:border-[#2f6fed]"
          />
          <button
            type="submit"
            aria-label="Envoyer"
            disabled={!draft.trim() || sending}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2f6fed] text-white disabled:opacity-45">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </Card>
      </div>
    </div>
  );
}
