"use client";

import { useEffect, useState } from "react";
import { Eye, Heart, MessageCircle } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { playChime } from "@/lib/chime";
import { cn } from "@/lib/cn";

export type SectionSocialData = {
  likes: number;
  liked: boolean;
  views: number;
  comments: number;
  people: { id: string; name: string; avatarUrl: string }[];
};

export function AvatarStack({ people, size = 24, max = 5 }: { people: SectionSocialData["people"]; size?: number; max?: number }) {
  if (!people.length) return null;
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="flex items-center" title={people.map((person) => person.name).join(", ")}>
      {shown.map((person, index) => (
        <UserAvatar key={person.id} name={person.name} url={person.avatarUrl} size={size} className={cn("ring-2 ring-white", index ? "-ml-2" : "")} />
      ))}
      {extra > 0 ? (
        <span className="-ml-2 inline-flex items-center justify-center rounded-full bg-[#eef2f7] text-[10px] font-semibold text-[#5e6875] ring-2 ring-white" style={{ width: size, height: size }}>
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

function reactorsLabel(people: SectionSocialData["people"]) {
  const names = people.map((person) => person.name.split(" ")[0]);
  if (!names.length) return "Soyez le premier à réagir.";
  if (names.length === 1) return `${names[0]} a réagi`;
  if (names.length === 2) return `${names[0]} et ${names[1]} ont réagi`;
  return `${names[0]}, ${names[1]} et ${names.length - 2} autre${names.length > 3 ? "s" : ""} ont réagi`;
}

export function SectionSocialBar({
  documentId,
  sectionId,
  social,
  onComment,
}: {
  documentId: string;
  sectionId: string;
  social: SectionSocialData;
  onComment: () => void;
}) {
  const [state, setState] = useState(social);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(0);

  useEffect(() => setState(social), [social]);

  useEffect(() => {
    let active = true;
    fetch(`/api/documents/${documentId}/sections/${sectionId}/view`, { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { views?: number } | null) => {
        if (active && typeof data?.views === "number") setState((current) => ({ ...current, views: data.views as number }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [documentId, sectionId]);

  async function toggle() {
    if (busy) return;
    const before = state;
    const liked = !before.liked;
    if (liked) {
      playChime();
      setPop((value) => value + 1);
    }
    setBusy(true);
    setState({ ...before, liked, likes: Math.max(0, before.likes + (liked ? 1 : -1)) });
    try {
      const response = await fetch(`/api/documents/${documentId}/sections/${sectionId}/like`, { method: "POST" });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { liked: boolean; likes: number };
      setState((current) => ({ ...current, liked: data.liked, likes: data.likes }));
    } catch {
      setState(before);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-[#5e6875]">
        <AvatarStack people={state.people} />
        <span className={state.people.length ? "font-medium text-[#243040]" : ""}>{reactorsLabel(state.people)}</span>
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-[#eef2f7] bg-[#fafbfd] p-1">
        <button
          type="button"
          aria-pressed={state.liked}
          disabled={busy}
          onClick={() => void toggle()}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition",
            state.liked ? "bg-[#ffe4ea] text-[#e11d48]" : "text-[#5e6875] hover:bg-white",
          )}
        >
          <Heart key={pop} className={cn("h-4 w-4", state.liked && "fill-current", pop > 0 && "animate-[like-pop_.4s_ease-out]")} />
          {state.likes ? state.likes : ""} J&apos;aime
        </button>
        <button type="button" onClick={onComment} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[#5e6875] hover:bg-white">
          <MessageCircle className="h-4 w-4" />
          {state.comments ? state.comments : ""} Commenter
        </button>
        <span className="ml-auto inline-flex items-center gap-1 px-2 text-xs text-[#8b939e]" title={`${state.views} vue${state.views > 1 ? "s" : ""}`}>
          <Eye className="h-4 w-4" />
          {state.views}
        </span>
      </div>
    </div>
  );
}

export function SocialCounts({ social }: { social: SectionSocialData }) {
  if (!social.likes && !social.comments) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-[#8b939e]">
      {social.likes ? (
        <span className="inline-flex items-center gap-0.5">
          <Heart className={cn("h-3 w-3", social.liked && "fill-[#e11d48] text-[#e11d48]")} />
          {social.likes}
        </span>
      ) : null}
      {social.comments ? (
        <span className="inline-flex items-center gap-0.5">
          <MessageCircle className="h-3 w-3" />
          {social.comments}
        </span>
      ) : null}
    </span>
  );
}
