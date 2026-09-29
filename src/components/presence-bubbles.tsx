"use client";

import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

export type BubblePerson = {
  key: string;
  name: string;
  organization: string;
  role: string;
  state: "online" | "offline" | "invited" | "draft";
  detail: string;
  isYou: boolean;
};

const PALETTE = ["#2f6fed", "#0f9d78", "#c56a10", "#7c3aed", "#d9466f", "#0e7490", "#4b5563"];

function colorFor(key: string) {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

const ORDER = { online: 0, offline: 1, invited: 2, draft: 3 } as const;

export function PresenceBubbles({
  people,
  max = 6,
  size = "md",
  className,
}: {
  people: BubblePerson[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(null);
        setPinned(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(null);
        setPinned(false);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sorted = [...people].sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.name.localeCompare(b.name, "fr"));
  const visible = sorted.slice(0, max);
  const hidden = sorted.slice(max);
  const online = people.filter((person) => person.state === "online").length;
  const dimension = size === "sm" ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-xs";

  return (
    <div ref={root} className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center -space-x-2">
        {visible.map((person) => {
          const invitee = person.state === "invited" || person.state === "draft";
          return (
            <div
              key={person.key}
              className="relative"
              onMouseEnter={() => { if (!pinned) setOpen(person.key); }}
              onMouseLeave={() => { if (!pinned) setOpen((current) => (current === person.key ? null : current)); }}
            >
              <button
                type="button"
                aria-label={`${person.name} — ${person.detail}`}
                aria-expanded={open === person.key}
                onClick={() => {
                  const closing = open === person.key && pinned;
                  setOpen(closing ? null : person.key);
                  setPinned(!closing);
                }}
                className={cn(
                  "relative flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white transition-transform hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-[#2f6fed]",
                  dimension,
                  invitee ? "border border-dashed border-[#9aa5b4] bg-[#f4f6f9] text-[#6b7280]" : "text-white",
                )}
                style={invitee ? undefined : { backgroundColor: colorFor(person.key) }}
              >
                {initials(person.name) || "?"}
                {invitee ? null : (
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                      person.state === "online" ? "bg-[#22c55e]" : "bg-[#c3c9d2]",
                    )}
                  />
                )}
              </button>
              {open === person.key ? (
                <div role="tooltip" className="absolute left-0 top-full z-30 mt-2 w-60 rounded-2xl border border-[#e6eef8] bg-white p-3 text-left shadow-lg">
                  <p className="truncate text-sm font-semibold text-[#10233f]">
                    {person.name}
                    {person.isYou ? <span className="font-normal text-[#8b939e]"> (vous)</span> : null}
                  </p>
                  {person.organization ? <p className="truncate text-xs text-[#5e6875]">{person.organization}</p> : null}
                  <p className="mt-1 text-xs text-[#8b939e]">{person.role}</p>
                  <p className={cn(
                    "mt-2 flex items-start gap-1.5 text-xs leading-5",
                    person.state === "online" ? "text-[#14804a]" : person.state === "offline" ? "text-[#5e6875]" : "text-[#c56a10]",
                  )}>
                    <span className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      person.state === "online" ? "bg-[#22c55e]" : person.state === "offline" ? "bg-[#c3c9d2]" : "bg-[#f5a524]",
                    )} />
                    {person.detail}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
        {hidden.length ? (
          <span
            title={hidden.map((person) => person.name).join(", ")}
            className={cn("flex shrink-0 items-center justify-center rounded-full bg-[#eef3f8] font-semibold text-[#3f4854] ring-2 ring-white", dimension)}
          >
            +{hidden.length}
          </span>
        ) : null}
      </div>
      {online > 0 ? <span className="whitespace-nowrap text-xs text-[#14804a]">{online} en ligne</span> : null}
    </div>
  );
}
