import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export const AGREEMENT_STEPS = ["Équipe", "Type", "Sections", "Envoyer"];

export function StepTrail({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className={cn("grid gap-2", steps.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
      {steps.map((label, index) => (
        <li
          key={label}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
            index === current ? "border-[#1e4ed8] bg-[#eef3ff] font-medium text-[#1e4ed8]" : index < current ? "border-[#d9e4ff] bg-white text-[#1e4ed8]" : "border-[#e6e8ee] bg-white text-[#8b939e]",
          )}
        >
          {index < current ? <Check className="h-3.5 w-3.5 shrink-0" /> : <span>{index + 1}.</span>}
          <span className="truncate">{label}</span>
        </li>
      ))}
    </ol>
  );
}
