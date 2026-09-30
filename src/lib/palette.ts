export const PALETTE = [
  { key: "blue", label: "Bleu", hex: "#2563eb", soft: "#dbeafe" },
  { key: "green", label: "Vert", hex: "#16a34a", soft: "#dcfce7" },
  { key: "orange", label: "Orange", hex: "#ea580c", soft: "#ffedd5" },
  { key: "violet", label: "Violet", hex: "#7c3aed", soft: "#ede9fe" },
  { key: "pink", label: "Rose", hex: "#db2777", soft: "#fce7f3" },
  { key: "teal", label: "Turquoise", hex: "#0d9488", soft: "#ccfbf1" },
  { key: "amber", label: "Ambre", hex: "#d97706", soft: "#fef3c7" },
  { key: "slate", label: "Ardoise", hex: "#475569", soft: "#e2e8f0" },
] as const;

export type ColorKey = (typeof PALETTE)[number]["key"];

export function paletteColor(key: string | null | undefined) {
  return PALETTE.find((item) => item.key === key) ?? null;
}

export function cleanColor(value: unknown): ColorKey | "" {
  return typeof value === "string" && PALETTE.some((item) => item.key === value) ? (value as ColorKey) : "";
}

export const REACTIONS = ["👍", "❤️", "👏", "✅", "😮"] as const;
