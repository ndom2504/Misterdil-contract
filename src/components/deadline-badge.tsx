import { CalendarClock } from "lucide-react";
import { DEADLINE_TONES, deadlineInfo } from "@/lib/agenda";
import { cn } from "@/lib/cn";

export function DeadlineBadge({
  dueDate,
  status,
  withDate = false,
  className,
}: {
  dueDate: string | null | undefined;
  status: string;
  withDate?: boolean;
  className?: string;
}) {
  const info = deadlineInfo(dueDate, status);
  if (!info) return null;
  const tone = DEADLINE_TONES[info.tone];
  return (
    <span
      title={`Échéance : ${info.date}`}
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", className)}
      style={{ color: tone.text, backgroundColor: tone.background, borderColor: tone.border }}
    >
      <CalendarClock className="h-3.5 w-3.5" />
      {info.label}
      {withDate && info.tone !== "done" ? <span className="font-normal opacity-80">· {info.date}</span> : null}
    </span>
  );
}
