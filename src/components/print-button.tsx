"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-[#1e4ed8] px-3 py-2 text-sm font-medium text-white">
      Imprimer
    </button>
  );
}
