"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Heart, MessageCircle, MessagesSquare, Phone, Trash2, X } from "lucide-react";
import { playChime } from "@/lib/chime";

type Notice = { id: string; kind: string; title: string; body: string; href: string; createdAt: string };

const POLL_MS = 15000;
const VISIBLE_MS = 6000;

const ICONS: Record<string, { Icon: typeof Bell; tone: string }> = {
  REACTION: { Icon: Heart, tone: "bg-[#ffe4ea] text-[#e11d48]" },
  COMMENT: { Icon: MessageCircle, tone: "bg-[#e8f0ff] text-[#2f6fed]" },
  MESSAGE: { Icon: MessagesSquare, tone: "bg-[#e8f0ff] text-[#2f6fed]" },
  CALL: { Icon: Phone, tone: "bg-[#e7f8ee] text-[#14804a]" },
  DELETE: { Icon: Trash2, tone: "bg-[#fdecec] text-[#b42318]" },
};

// Polls for notifications created since the page opened and shows each new one as a
// pop-up with the Misterdil chime; the bell count follows through router.refresh().
export function NotificationToaster() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Notice[]>([]);
  const since = useRef(new Date().toISOString());
  const seen = useRef(new Set<string>());

  useEffect(() => {
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(`/api/mobile/notifications?since=${encodeURIComponent(since.current)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { notifications?: Notice[] };
        const fresh = (data.notifications ?? []).filter((item) => !seen.current.has(item.id));
        if (!fresh.length || stopped) return;
        for (const item of fresh) seen.current.add(item.id);
        since.current = fresh.reduce((latest, item) => (item.createdAt > latest ? item.createdAt : latest), since.current);
        setToasts((current) => [...fresh.slice(0, 3).reverse(), ...current].slice(0, 3));
        playChime();
        router.refresh();
      } catch {
        // Offline or signed out: try again on the next tick.
      }
    }
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [router]);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => setToasts((current) => current.slice(0, -1)), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {toasts.map((toast) => {
        const { Icon, tone } = ICONS[toast.kind] ?? { Icon: Bell, tone: "bg-[#e8f0ff] text-[#2f6fed]" };
        const dismiss = () => setToasts((current) => current.filter((item) => item.id !== toast.id));
        return (
          <div key={toast.id} className="pointer-events-auto flex animate-[toast-in_.35s_cubic-bezier(.2,1.2,.4,1)] items-start gap-3 rounded-2xl border border-[#e6eef8] bg-white p-3 shadow-[0_12px_32px_rgba(11,31,58,0.16)]">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Icon className="h-4 w-4" />
            </span>
            <Link href={toast.href || "/notifications"} onClick={dismiss} className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#10233f]">{toast.title}</p>
              {toast.body ? <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#5e6875]">{toast.body}</p> : null}
            </Link>
            <button type="button" aria-label="Fermer" onClick={dismiss} className="rounded-full p-1 text-[#8b939e] hover:bg-[#f4f7fb]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
