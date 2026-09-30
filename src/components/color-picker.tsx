"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/cn";
import { PALETTE, paletteColor } from "@/lib/palette";

type Props = {
  endpoint: string;
  value: string;
  label: string;
  compact?: boolean;
  onChange?: (color: string) => void;
};

export function ColorDot({ value, className }: { value: string; className?: string }) {
  const color = paletteColor(value);
  return (
    <span
      className={cn("inline-block h-3 w-3 shrink-0 rounded-full", color ? "" : "border border-dashed border-[#aab2bd]", className)}
      style={color ? { backgroundColor: color.hex } : undefined}
    />
  );
}

// The colour is shared by every party, so it is saved at once rather than kept locally.
export function ColorPicker({ endpoint, value, label, compact = false, onChange }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(value);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setCurrent(value), [value]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function pick(color: string) {
    const previous = current;
    setCurrent(color);
    setOpen(false);
    setError("");
    onChange?.(color);
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    }).catch(() => null);
    if (!response?.ok) {
      setCurrent(previous);
      onChange?.(previous);
      const data = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Couleur non enregistrée.");
      return;
    }
    router.refresh();
  }

  const selected = paletteColor(current);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen((state) => !state)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-[#e6eef8] bg-white text-xs text-[#243040] hover:border-[#c9d7fb]",
          compact ? "h-7 px-2" : "h-9 px-3",
        )}
      >
        {selected ? <ColorDot value={current} /> : <Palette className="h-3.5 w-3.5 text-[#8b939e]" />}
        {compact ? null : <span>{selected ? selected.label : "Couleur"}</span>}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-60 rounded-2xl border border-[#e6eef8] bg-white p-3 shadow-lg">
          <p className="text-xs font-semibold text-[#10233f]">{label}</p>
          <p className="mt-0.5 text-[11px] text-[#8b939e]">Visible par toutes les parties.</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {PALETTE.map((item) => (
              <button
                key={item.key}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => void pick(item.key)}
                className={cn("flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 transition hover:scale-110", current === item.key && "ring-2 ring-[#10233f]")}
                style={{ backgroundColor: item.hex }}
              >
                {current === item.key ? <Check className="h-4 w-4 text-white" /> : null}
              </button>
            ))}
            <button
              type="button"
              title="Aucune"
              aria-label="Sans couleur"
              onClick={() => void pick("")}
              className={cn("flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[#aab2bd] text-[10px] text-[#8b939e]", !current && "ring-2 ring-[#10233f] ring-offset-2")}
            >
              Ø
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="absolute right-0 mt-1 w-56 text-right text-[11px] text-[#9f2d2d]">{error}</p> : null}
    </div>
  );
}
