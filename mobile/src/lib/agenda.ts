// Days are "YYYY-MM-DD" and times "HH:MM", read as Montréal/Toronto wall-clock time by the server.
export type DeadlineTone = 'overdue' | 'urgent' | 'soon' | 'ok' | 'done';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function dayToDate(day: string, time = '12:00') {
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, date, hour, minute);
}

export function addDays(day: string, count: number) {
  const date = dayToDate(day);
  date.setDate(date.getDate() + count);
  return localDay(date);
}

function daysBetween(from: string, to: string) {
  const [a, b] = [from, to].map((day) => {
    const [year, month, date] = day.split('-').map(Number);
    return Date.UTC(year, month - 1, date);
  });
  return Math.round((b - a) / 86_400_000);
}

export function dayLabel(day: string, withYear = true) {
  const [year, month, date] = day.split('-').map(Number);
  return `${date} ${MONTHS[month - 1] ?? ''}${withYear ? ` ${year}` : ''}`;
}

export function weekdayLabel(day: string) {
  return WEEKDAYS[dayToDate(day).getDay()] ?? '';
}

export function clock(time: string) {
  return time.replace(':', ' h ');
}

export function deadlineInfo(dueDate: string | null | undefined, status: string, today = localDay()) {
  if (!dueDate) return null;
  const date = dayLabel(dueDate);
  if (status === 'FINAL') return { tone: 'done' as DeadlineTone, days: 0, label: 'Terminée', date };
  const days = daysBetween(today, dueDate);
  const tone: DeadlineTone = days < 0 ? 'overdue' : days <= 3 ? 'urgent' : days <= 14 ? 'soon' : 'ok';
  const label =
    days < 0 ? `En retard de ${-days} j` : days === 0 ? "Échéance aujourd'hui" : days === 1 ? 'Échéance demain' : `J-${days}`;
  return { tone, days, label, date };
}

export const DEADLINE_TONES: Record<DeadlineTone, { text: string; background: string; border: string }> = {
  overdue: { text: '#b42318', background: '#fef3f2', border: '#fecdca' },
  urgent: { text: '#b54708', background: '#fff6ed', border: '#fedf89' },
  soon: { text: '#93370d', background: '#fffaeb', border: '#fef0c7' },
  ok: { text: '#067647', background: '#ecfdf3', border: '#abefc6' },
  done: { text: '#475467', background: '#f2f4f7', border: '#e4e7ec' },
};
