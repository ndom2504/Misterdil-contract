import { cn } from "@/lib/cn";

const PALETTE = ["#2f6fed", "#0f9d7a", "#c2410c", "#7c3aed", "#be185d", "#0369a1", "#4d7c0f", "#b45309"];

function colorFor(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")).toUpperCase();
}

export function UserAvatar({ name, url, size = 36, className }: { name: string; url?: string; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (url) {
    // Private, authenticated image route: next/image optimisation would fetch it without the session.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} style={style} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span
      aria-label={name}
      style={{ ...style, backgroundColor: colorFor(name), fontSize: Math.round(size * 0.38) }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}>
      {initials(name)}
    </span>
  );
}
