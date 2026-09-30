// Dates of the agenda are expressed in the Toronto zone, whatever the device's zone:
// a day is "YYYY-MM-DD" and a time "HH:MM".
export const AGENDA_ZONE = "America/Toronto";

export type AgendaKind = "MEETING" | "DEADLINE";

export type AgendaItem = {
  id: string;
  documentId: string;
  documentTitle: string;
  kind: AgendaKind;
  title: string;
  notes: string;
  location: string;
  startsAt: string;
  endsAt: string | null;
  day: string;
  time: string;
  endTime: string;
  createdByName: string;
  outlook: boolean;
  onlineUrl: string;
  canDelete: boolean;
};

export type DeadlineTone = "overdue" | "urgent" | "soon" | "ok" | "done";

export type DeadlineInfo = { tone: DeadlineTone; days: number; label: string; date: string };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const WEEKDAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

function parts(date: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: AGENDA_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return values as Record<"year" | "month" | "day" | "hour" | "minute", string>;
}

export function zoneDay(date: Date) {
  const value = parts(date);
  return `${value.year}-${value.month}-${value.day}`;
}

export function zoneTime(date: Date) {
  const value = parts(date);
  return `${value.hour}:${value.minute}`;
}

export function validDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function offsetAt(ms: number) {
  const value = parts(new Date(ms));
  const asUtc = Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day), Number(value.hour), Number(value.minute));
  return asUtc - Math.floor(ms / 60_000) * 60_000;
}

// The instant at which the Toronto clock shows this day and time.
export function zonedInstant(day: string, time: string) {
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, date, hour, minute);
  let instant = wall - offsetAt(wall);
  instant = wall - offsetAt(instant);
  return new Date(instant);
}

export function addDays(day: string, count: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function dayLabel(day: string, withYear = true) {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1] ?? ""}${withYear ? ` ${year}` : ""}`;
}

export function weekdayLabel(day: string) {
  return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()] ?? "";
}

export function monthLabel(month: string) {
  const [year, index] = month.split("-").map(Number);
  const names = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  return `${names[index - 1] ?? ""} ${year}`;
}

export function deadlineInfo(dueDate: string | null | undefined, status: string, today = zoneDay(new Date())): DeadlineInfo | null {
  if (!dueDate) return null;
  const date = dayLabel(dueDate);
  if (status === "FINAL") return { tone: "done", days: 0, label: "Terminée", date };
  const days = daysBetween(today, dueDate);
  if (days < 0) return { tone: "overdue", days, label: `En retard de ${-days} j`, date };
  if (days === 0) return { tone: "urgent", days, label: "Échéance aujourd'hui", date };
  if (days === 1) return { tone: "urgent", days, label: "Échéance demain", date };
  if (days <= 3) return { tone: "urgent", days, label: `J-${days}`, date };
  if (days <= 14) return { tone: "soon", days, label: `J-${days}`, date };
  return { tone: "ok", days, label: `J-${days}`, date };
}

export const DEADLINE_TONES: Record<DeadlineTone, { text: string; background: string; border: string; dot: string }> = {
  overdue: { text: "#b42318", background: "#fef3f2", border: "#fecdca", dot: "#d92d20" },
  urgent: { text: "#b54708", background: "#fff6ed", border: "#fedf89", dot: "#ef6820" },
  soon: { text: "#93370d", background: "#fffaeb", border: "#fef0c7", dot: "#f79009" },
  ok: { text: "#067647", background: "#ecfdf3", border: "#abefc6", dot: "#17b26a" },
  done: { text: "#475467", background: "#f2f4f7", border: "#e4e7ec", dot: "#667085" },
};
