import { documentStatusLabel, sectionStatusLabel } from "@/lib/domain";
import { cn } from "@/lib/cn";

const tones: Record<string, string> = {
  DRAFT: "bg-[#f3f4f6] text-[#4b5563]",
  IN_DISCUSSION: "bg-[#fff7e8] text-[#92580a]",
  PENDING_VALIDATION: "bg-[#fff4e8] text-[#9a4d12]",
  PENDING_SIGNATURE: "bg-[#eef3ff] text-[#1e4ed8]",
  FINAL: "bg-[#e9f8ef] text-[#0f7a3a]",
  NOT_STARTED: "bg-[#f3f4f6] text-[#4b5563]",
  IN_PREPARATION: "bg-[#eef3ff] text-[#1e4ed8]",
  CHANGES_REQUESTED: "bg-[#fff1e8] text-[#b45309]",
  VALIDATED: "bg-[#e9f8ef] text-[#0f7a3a]",
  LOCKED: "bg-[#eef0f3] text-[#3f4854]",
  OPEN: "bg-[#fff7e8] text-[#92580a]",
  RESOLVED: "bg-[#e9f8ef] text-[#0f7a3a]",
  PENDING: "bg-[#fff7e8] text-[#92580a]",
  ACCEPTED: "bg-[#e9f8ef] text-[#0f7a3a]",
  REJECTED: "bg-[#f8eaea] text-[#9f2d2d]",
  MODIFIED: "bg-[#eef3ff] text-[#1e4ed8]",
  REQUIRED: "bg-[#fff7e8] text-[#92580a]",
  SIGNED: "bg-[#e9f8ef] text-[#0f7a3a]",
};

export function StatusBadge({ status, kind = "document" }: { status: string; kind?: "document" | "section" | "raw" }) {
  const label = kind === "section" ? sectionStatusLabel(status) : kind === "document" ? documentStatusLabel(status) : status;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[status] ?? "bg-[#f3f4f6] text-[#4b5563]")}>
      {label}
    </span>
  );
}
