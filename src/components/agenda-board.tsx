"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { EventForm, EventRow } from "@/components/agenda-ui";
import { DeadlineBadge } from "@/components/deadline-badge";
import { Button } from "@/components/ui";
import { dayLabel, type AgendaItem } from "@/lib/agenda";

export function AgendaBoard({
  events,
  deadlines,
  documents,
}: {
  events: AgendaItem[];
  deadlines: { documentId: string; title: string; dueDate: string; status: string }[];
  documents: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const open = deadlines.filter((deadline) => deadline.status !== "FINAL");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-[#10233f]">À venir</h2>
        {documents.length && !adding ? (
          <Button type="button" onClick={() => { setAdding(true); setNotice(""); }}><Plus className="h-4 w-4" />Planifier</Button>
        ) : null}
      </div>
      {notice ? <p className="rounded-xl border border-[#fedf89] bg-[#fffaeb] px-3 py-2 text-sm text-[#93370d]">{notice}</p> : null}
      {adding ? (
        <EventForm
          documents={documents}
          onCancel={() => setAdding(false)}
          onCreated={(_event, hint) => {
            setAdding(false);
            setNotice(hint);
            router.refresh();
          }}
        />
      ) : null}
      {open.length ? (
        <section className="space-y-2 rounded-2xl border border-[#e6eef8] bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8b939e]">Échéances des ententes</p>
          <ul className="space-y-2">
            {open.map((deadline) => (
              <li key={deadline.documentId}>
                <Link href={`/documents/${deadline.documentId}?onglet=agenda`} className="flex items-center justify-between gap-2 text-sm hover:text-[#2f6fed]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-[#10233f]">{deadline.title}</span>
                    <span className="text-xs text-[#6b7280]">{dayLabel(deadline.dueDate)}</span>
                  </span>
                  <DeadlineBadge dueDate={deadline.dueDate} status={deadline.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {events.length ? (
        <ul className="space-y-2">
          {events.map((event) => <EventRow key={event.id} event={event} showDocument onDeleted={() => router.refresh()} />)}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-[#d9e1ec] bg-white px-4 py-6 text-center text-sm text-[#5e6875]">Aucune rencontre prévue.</p>
      )}
    </div>
  );
}
