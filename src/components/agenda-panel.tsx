"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Plus } from "lucide-react";
import { EventForm, EventRow, fetchAgenda, saveDueDate } from "@/components/agenda-ui";
import { DeadlineBadge } from "@/components/deadline-badge";
import { Button, controlClass } from "@/components/ui";
import { dayLabel, zoneDay, type AgendaItem } from "@/lib/agenda";

type DocumentAgenda = { dueDate: string | null; status: string; canAdd: boolean; canEditDue: boolean; events: AgendaItem[] };

export function AgendaPanel({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [agenda, setAgenda] = useState<DocumentAgenda | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingDue, setEditingDue] = useState(false);
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setAgenda(await fetchAgenda<DocumentAgenda>(`/api/documents/${documentId}/agenda`));
    } catch (reason) {
      setError((reason as Error).message);
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!agenda) {
    return error ? <p className="text-sm text-[#9f2d2d]">{error}</p> : <p className="text-sm text-[#8b939e]">Chargement de l&apos;agenda...</p>;
  }

  const today = zoneDay(new Date());
  const upcoming = agenda.events.filter((event) => event.day >= today);
  const past = agenda.events.filter((event) => event.day < today).reverse();

  async function submitDue() {
    setSaving(true);
    setError("");
    try {
      const result = await saveDueDate(documentId, due);
      setAgenda((current) => (current ? { ...current, dueDate: result.dueDate } : current));
      setEditingDue(false);
      router.refresh();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function removed(id: string) {
    setAgenda((current) => (current ? { ...current, events: current.events.filter((event) => event.id !== id) } : current));
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#10233f]">Rencontres et échéances</h2>
          {agenda.canAdd && !adding ? (
            <Button type="button" onClick={() => { setAdding(true); setNotice(""); }}><Plus className="h-4 w-4" />Planifier</Button>
          ) : null}
        </div>
        {notice ? <p className="rounded-xl border border-[#fedf89] bg-[#fffaeb] px-3 py-2 text-sm text-[#93370d]">{notice}</p> : null}
        {adding ? (
          <EventForm
            documentId={documentId}
            onCancel={() => setAdding(false)}
            onCreated={(event, hint) => {
              setAgenda((current) =>
                current ? { ...current, events: [...current.events, event].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) } : current,
              );
              setAdding(false);
              setNotice(hint);
            }}
          />
        ) : null}
        {upcoming.length ? (
          <ul className="space-y-2">{upcoming.map((event) => <EventRow key={event.id} event={event} onDeleted={removed} />)}</ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-[#d9e1ec] bg-white px-4 py-6 text-center text-sm text-[#5e6875]">
            Aucune rencontre ni échéance à venir.{agenda.canAdd ? " Planifiez la prochaine étape avec les parties." : ""}
          </p>
        )}
        {past.length ? (
          <details className="rounded-2xl border border-[#e6eef8] bg-white p-3">
            <summary className="cursor-pointer text-sm text-[#5e6875]">Passés ({past.length})</summary>
            <ul className="mt-3 space-y-2">{past.map((event) => <EventRow key={event.id} event={event} onDeleted={removed} />)}</ul>
          </details>
        ) : null}
      </div>

      <aside className="space-y-3 rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#10233f]"><CalendarClock className="h-4 w-4 text-[#2f6fed]" />Échéance de l&apos;entente</p>
        {agenda.dueDate ? (
          <>
            <p className="text-2xl font-semibold text-[#10233f]">{dayLabel(agenda.dueDate)}</p>
            <DeadlineBadge dueDate={agenda.dueDate} status={agenda.status} />
          </>
        ) : (
          <p className="text-sm text-[#5e6875]">Aucune échéance fixée.</p>
        )}
        {agenda.canEditDue ? (
          editingDue ? (
            <div className="space-y-2">
              <input type="date" className={controlClass} value={due} min={today} onChange={(event) => setDue(event.target.value)} />
              <div className="flex gap-2">
                <Button type="button" disabled={!due || saving} onClick={submitDue}>{saving ? "..." : "Enregistrer"}</Button>
                <Button type="button" variant="secondary" onClick={() => setEditingDue(false)}>Annuler</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={() => { setDue(agenda.dueDate ?? ""); setEditingDue(true); }}>
              {agenda.dueDate ? "Modifier l'échéance" : "Fixer l'échéance"}
            </Button>
          )
        ) : null}
        {error ? <p className="text-sm text-[#9f2d2d]">{error}</p> : null}
        {upcoming[0] ? (
          <div className="border-t border-[#eef2f7] pt-3 text-sm">
            <p className="text-xs text-[#8b939e]">Prochain rendez-vous</p>
            <p className="mt-1 font-medium text-[#10233f]">{upcoming[0].title}</p>
            <p className="text-xs text-[#5e6875]">{dayLabel(upcoming[0].day)} · {upcoming[0].time.replace(":", " h ")}</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
