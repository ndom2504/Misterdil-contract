"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarCheck, CalendarClock, MapPin, Trash2, Users, Video } from "lucide-react";
import { Button, Field, controlClass } from "@/components/ui";
import { addDays, dayLabel, weekdayLabel, zoneDay, type AgendaItem, type AgendaKind } from "@/lib/agenda";
import { cn } from "@/lib/cn";

async function call<T>(url: string, { json, ...init }: RequestInit & { json?: unknown } = {}) {
  const response = await fetch(url, {
    ...init,
    headers: json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "L'action n'a pas abouti.");
  return data;
}

export function fetchAgenda<T>(url: string) {
  return call<T>(url, { cache: "no-store" });
}

export function saveDueDate(documentId: string, dueDate: string) {
  return call<{ ok: true; dueDate: string }>(`/api/documents/${documentId}/agenda`, { method: "PATCH", json: { dueDate } });
}

function clock(time: string) {
  return time.replace(":", " h ");
}

export function EventRow({
  event,
  showDocument = false,
  onDeleted,
}: {
  event: AgendaItem;
  showDocument?: boolean;
  onDeleted: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const meeting = event.kind === "MEETING";
  const past = event.day < zoneDay(new Date());

  async function remove() {
    const question = meeting && event.outlook
      ? "Annuler cette rencontre ? Les participants invités via Outlook recevront l'annulation."
      : "Retirer cet événement de l'agenda ?";
    if (!window.confirm(question)) return;
    setBusy(true);
    setError("");
    try {
      await call(`/api/documents/${event.documentId}/agenda/${event.id}`, { method: "DELETE" });
      onDeleted(event.id);
    } catch (reason) {
      setError((reason as Error).message);
      setBusy(false);
    }
  }

  return (
    <li className={cn("flex gap-3 rounded-2xl border border-[#e6eef8] bg-white p-3", past && "opacity-60")}>
      <div className={cn("flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-1.5", meeting ? "bg-[#eef3ff] text-[#1e4ed8]" : "bg-[#fff6ed] text-[#b54708]")}>
        <span className="text-[11px] uppercase">{weekdayLabel(event.day)}</span>
        <span className="text-lg font-semibold leading-6">{Number(event.day.slice(8))}</span>
        <span className="text-[11px]">{dayLabel(event.day, false).split(" ")[1]}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", meeting ? "bg-[#eef3ff] text-[#1e4ed8]" : "bg-[#fff6ed] text-[#b54708]")}>
            {meeting ? <Users className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
            {meeting ? "Rencontre" : "Échéance"}
          </span>
          <p className="truncate text-sm font-medium text-[#10233f]">{event.title}</p>
        </div>
        <p className="mt-1 text-xs text-[#5e6875]">
          {meeting ? `${clock(event.time)} – ${clock(event.endTime)}` : `Avant ${clock(event.time)}`}
          {event.location ? (
            <span className="ml-2 inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>
          ) : null}
          <span className="ml-2">· par {event.createdByName}</span>
        </p>
        {showDocument ? (
          <Link href={`/documents/${event.documentId}?onglet=agenda`} className="mt-1 block truncate text-xs text-[#2f6fed] hover:underline">{event.documentTitle}</Link>
        ) : null}
        {event.notes ? <p className="mt-1 whitespace-pre-line text-xs leading-5 text-[#3f4854]">{event.notes}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {event.outlook ? <span className="inline-flex items-center gap-1 text-[11px] text-[#14804a]"><CalendarCheck className="h-3 w-3" />Dans Outlook</span> : null}
          {event.onlineUrl && !past ? (
            <a href={event.onlineUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-[#2f6fed] px-2.5 py-1 text-[11px] font-medium text-white">
              <Video className="h-3 w-3" />Rejoindre Teams
            </a>
          ) : null}
        </div>
        {error ? <p className="mt-1 text-xs text-[#9f2d2d]">{error}</p> : null}
      </div>
      {event.canDelete ? (
        <button type="button" disabled={busy} onClick={remove} aria-label="Retirer" className="self-start rounded-full p-1.5 text-[#8b939e] hover:bg-[#fff4f4] hover:text-[#9f2d2d] disabled:opacity-50">
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </li>
  );
}

export function EventForm({
  documentId,
  documents,
  defaultDay,
  onCreated,
  onCancel,
}: {
  documentId?: string;
  documents?: { id: string; title: string }[];
  defaultDay?: string;
  onCreated: (event: AgendaItem, hint: string) => void;
  onCancel?: () => void;
}) {
  const today = zoneDay(new Date());
  const [kind, setKind] = useState<AgendaKind>("MEETING");
  const [target, setTarget] = useState(documentId ?? documents?.[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(defaultDay && defaultDay >= today ? defaultDay : addDays(today, 1));
  const [time, setTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [online, setOnline] = useState(true);
  const [outlook, setOutlook] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const meeting = kind === "MEETING";

  function pickKind(next: AgendaKind) {
    setKind(next);
    if (next === "DEADLINE" && time === "10:00") setTime("17:00");
    if (next === "MEETING" && time === "17:00") setTime("10:00");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return setError("Choisissez l'entente.");
    setBusy(true);
    setError("");
    try {
      const result = await call<{ event: AgendaItem; hint: string }>(`/api/documents/${target}/agenda`, {
        method: "POST",
        json: { kind, title, notes, location, day, time, endTime, online: meeting && online, outlook },
      });
      onCreated(result.event, result.hint);
      setTitle("");
      setNotes("");
      setLocation("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[#e6eef8] bg-white p-4 shadow-sm">
      <div className="inline-flex rounded-full border border-[#e6eef8] bg-[#f7f9fc] p-1 text-sm">
        {(["MEETING", "DEADLINE"] as const).map((value) => (
          <button key={value} type="button" onClick={() => pickKind(value)} className={cn("rounded-full px-3 py-1.5", kind === value ? "bg-white font-medium text-[#1e4ed8] shadow-sm" : "text-[#5e6875]")}>
            {value === "MEETING" ? "Rencontre" : "Échéance"}
          </button>
        ))}
      </div>
      {documents ? (
        <Field label="Entente">
          <select className={controlClass} value={target} onChange={(item) => setTarget(item.target.value)}>
            {documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
          </select>
        </Field>
      ) : null}
      <Field label={meeting ? "Objet de la rencontre" : "Ce qui doit être remis"}>
        <input className={controlClass} value={title} onChange={(item) => setTitle(item.target.value)} placeholder={meeting ? "Revue des articles 3 à 5" : "Version révisée des annexes"} required minLength={2} maxLength={160} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Date">
          <input type="date" className={controlClass} value={day} min={today} onChange={(item) => setDay(item.target.value)} required />
        </Field>
        <Field label={meeting ? "Début" : "Heure limite"}>
          <input type="time" className={controlClass} value={time} onChange={(item) => setTime(item.target.value)} required />
        </Field>
        {meeting ? (
          <Field label="Fin">
            <input type="time" className={controlClass} value={endTime} onChange={(item) => setEndTime(item.target.value)} required />
          </Field>
        ) : null}
      </div>
      {meeting ? (
        <Field label="Lieu" hint="Facultatif. Adresse, salle ou visioconférence.">
          <input className={controlClass} value={location} onChange={(item) => setLocation(item.target.value)} maxLength={200} />
        </Field>
      ) : null}
      <Field label="Notes" hint="Facultatif. Ordre du jour, documents à préparer...">
        <textarea className={cn(controlClass, "min-h-20")} value={notes} onChange={(item) => setNotes(item.target.value)} maxLength={2000} />
      </Field>
      <div className="space-y-2 text-sm text-[#3f4854]">
        {meeting ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={online} onChange={(item) => setOnline(item.target.checked)} />
            Réunion Teams (lien de visioconférence)
          </label>
        ) : null}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={outlook} onChange={(item) => setOutlook(item.target.checked)} />
          {meeting ? "Ajouter à mon calendrier Outlook et inviter les parties" : "Ajouter un rappel à mon calendrier Outlook"}
        </label>
        <p className="text-xs text-[#8b939e]">Heures de Montréal/Toronto. Outlook est utilisé seulement si votre compte Microsoft est connecté.</p>
      </div>
      {error ? <p className="text-sm text-[#9f2d2d]">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Enregistrement..." : meeting ? "Planifier la rencontre" : "Ajouter l'échéance"}</Button>
        {onCancel ? <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button> : null}
      </div>
    </form>
  );
}
