"use client";

import dynamic from "next/dynamic";
import { Phone, PhoneCall, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CallCredentials } from "@/components/call-panel";
import { Card } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

const CallPanel = dynamic(() => import("@/components/call-panel"), { ssr: false });

type ChatMessage = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorAvatar: string;
  body: string;
  kind: string;
  createdAt: string;
};
type CallStatus = { configured: boolean; active: boolean; participants: { id: string; name: string }[] };
type Reply = { messages: ChatMessage[]; call: CallStatus };

const POLL_MS = 3000;

function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  const known = new Set(current.map((item) => item.id));
  const added = incoming.filter((item) => !known.has(item.id));
  return added.length ? [...current, ...added] : current;
}

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "Une erreur est survenue.";
}

export function EntenteChat({ documentId, currentUserId, callInvite }: { documentId: string; currentUserId: string; callInvite: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [call, setCall] = useState<CallStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<CallCredentials | null>(null);
  const [joining, setJoining] = useState(false);
  const cursor = useRef<string | null>(null);
  const list = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const after = cursor.current ? `?after=${encodeURIComponent(cursor.current)}` : "";
    const response = await fetch(`/api/documents/${documentId}/messages${after}`, { cache: "no-store" });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = (await response.json()) as Reply;
    setMessages((current) => merge(current ?? [], data.messages));
    setCall(data.call);
    const last = data.messages[data.messages.length - 1];
    if (last) cursor.current = last.createdAt;
    setError("");
  }, [documentId]);

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
      setMessages((current) => merge(current ?? [], [data.message]));
      setDraft("");
      setError("");
    } else {
      setError(await readError(response));
    }
    setSending(false);
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

      <Card className="flex flex-col p-0">
        <div className="border-b border-[#eef2f7] px-5 py-4">
          <h2 className="font-semibold text-[#10233f]">Discussion de l&apos;entente</h2>
          <p className="text-xs text-[#8b939e]">Visible par toutes les parties prenantes de l&apos;entente.</p>
        </div>
        <div ref={list} className="h-[460px] space-y-2 overflow-y-auto px-5 py-4">
          {messages === null ? (
            <p className="text-sm text-[#8b939e]">Chargement…</p>
          ) : messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#8b939e]">Aucun message. Écrivez aux parties prenantes de cette entente.</p>
          ) : (
            messages.map((item, index) => {
              if (item.kind === "CALL") {
                return (
                  <p key={item.id} className="flex items-center justify-center gap-2 py-1 text-xs text-[#6b7280]">
                    <Phone className="h-3.5 w-3.5" />
                    {item.body} · {formatDateTime(item.createdAt)}
                  </p>
                );
              }
              const mine = item.authorId === currentUserId;
              const previous = messages[index - 1];
              const first = !previous || previous.authorId !== item.authorId || previous.kind === "CALL";
              return (
                <div key={item.id} className={cn("flex items-end gap-2", mine && "justify-end", first && "pt-2")}>
                  {!mine ? <div className="w-8">{first ? <UserAvatar name={item.authorName} url={item.authorAvatar} size={32} /> : null}</div> : null}
                  <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2", mine ? "rounded-br-md bg-[#2f6fed] text-white" : "rounded-bl-md border border-[#eef2f7] bg-[#f7f8fb] text-[#10233f]")}>
                    {!mine && first ? <p className="text-xs font-semibold text-[#2f6fed]">{item.authorName}</p> : null}
                    <p className="text-sm leading-6 whitespace-pre-wrap">{item.body}</p>
                    <p className={cn("text-right text-[11px]", mine ? "text-white/75" : "text-[#8b939e]")}>{formatDateTime(item.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {error ? <p className="px-5 pb-2 text-sm text-[#9f2d2d]">{error}</p> : null}
        <form
          className="flex items-end gap-2 border-t border-[#eef2f7] px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
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
  );
}
