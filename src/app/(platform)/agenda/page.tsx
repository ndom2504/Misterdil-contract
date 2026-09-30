import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AgendaBoard } from "@/components/agenda-board";
import { DEADLINE_TONES, addDays, deadlineInfo, monthLabel, zoneDay } from "@/lib/agenda";
import { cn } from "@/lib/cn";
import { userAgenda } from "@/server/agenda";
import { requireUser } from "@/server/current-user";

export const metadata = { title: "Agenda" };

const WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function shiftMonth(month: string, count: number) {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + count, 1));
  return date.toISOString().slice(0, 7);
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const user = await requireUser();
  const { mois } = await searchParams;
  const today = zoneDay(new Date());
  const month = mois && /^\d{4}-(0[1-9]|1[0-2])$/.test(mois) ? mois : today.slice(0, 7);
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const gridStart = addDays(first, -lead);
  const cells = Array.from({ length: Math.ceil((lead + Number(last.slice(8))) / 7) * 7 }, (_, index) => addDays(gridStart, index));

  const [calendar, upcoming] = await Promise.all([
    userAgenda(user, cells[0], cells[cells.length - 1]),
    userAgenda(user, today, addDays(today, 45)),
  ]);
  const overdue = upcoming.documents
    .filter((document) => document.dueDate && document.dueDate < today)
    .map((document) => ({ documentId: document.id, title: document.title, dueDate: document.dueDate as string, status: document.status }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#10233f]">Agenda</h1>
            <p className="mt-1 text-sm text-[#5e6875]">Rencontres et échéances de toutes vos ententes.</p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-[#e6eef8] bg-white p-1 shadow-sm">
            <Link href={`/agenda?mois=${shiftMonth(month, -1)}`} aria-label="Mois précédent" className="rounded-full p-2 text-[#5e6875] hover:bg-[#f4f7fb]"><ChevronLeft className="h-4 w-4" /></Link>
            <span className="min-w-36 text-center text-sm font-medium capitalize text-[#10233f]">{monthLabel(month)}</span>
            <Link href={`/agenda?mois=${shiftMonth(month, 1)}`} aria-label="Mois suivant" className="rounded-full p-2 text-[#5e6875] hover:bg-[#f4f7fb]"><ChevronRight className="h-4 w-4" /></Link>
            {month !== today.slice(0, 7) ? <Link href="/agenda" className="rounded-full px-3 py-1.5 text-xs text-[#2f6fed] hover:bg-[#f4f7fb]">Aujourd&apos;hui</Link> : null}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#e6eef8] bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-[#eef2f7] text-center text-[11px] uppercase tracking-wide text-[#8b939e]">
            {WEEK.map((label) => <div key={label} className="py-2">{label}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day) => {
              const events = calendar.events.filter((event) => event.day === day);
              const deadlines = calendar.deadlines.filter((deadline) => deadline.dueDate === day);
              const outside = !day.startsWith(month);
              return (
                <div key={day} className={cn("min-h-24 border-b border-r border-[#f2f5f9] p-1.5 sm:min-h-28", outside && "bg-[#fafbfd]")}>
                  <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", day === today ? "bg-[#2f6fed] font-semibold text-white" : outside ? "text-[#b6bcc6]" : "text-[#3f4854]")}>
                    {Number(day.slice(8))}
                  </span>
                  <div className="mt-1 space-y-1">
                    {deadlines.map((deadline) => {
                      const info = deadlineInfo(deadline.dueDate, deadline.status, today);
                      const tone = DEADLINE_TONES[info?.tone ?? "ok"];
                      return (
                        <Link
                          key={deadline.documentId}
                          href={`/documents/${deadline.documentId}?onglet=agenda`}
                          title={`Échéance de l'entente « ${deadline.title} »`}
                          className="block truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
                          style={{ color: tone.text, backgroundColor: tone.background, borderColor: tone.border }}
                        >
                          ⚑ {deadline.title}
                        </Link>
                      );
                    })}
                    {events.map((event) => (
                      <Link
                        key={event.id}
                        href={`/documents/${event.documentId}?onglet=agenda`}
                        title={`${event.title} · ${event.documentTitle}`}
                        className={cn(
                          "block truncate rounded-md px-1.5 py-0.5 text-[11px]",
                          event.kind === "MEETING" ? "bg-[#eef3ff] text-[#1e4ed8]" : "bg-[#fff6ed] text-[#b54708]",
                        )}
                      >
                        <span className="font-medium">{event.time}</span> {event.title}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <p className="flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#eef3ff] ring-1 ring-[#c9d7fb]" />Rencontre</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#fff6ed] ring-1 ring-[#fedf89]" />Échéance intermédiaire</span>
          <span className="inline-flex items-center gap-1">⚑ Échéance de l&apos;entente (couleur selon le délai restant)</span>
        </p>
      </div>

      <AgendaBoard events={upcoming.events} deadlines={[...overdue, ...upcoming.deadlines]} documents={upcoming.documents} />
    </div>
  );
}
