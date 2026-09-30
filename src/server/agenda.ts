import { after } from "next/server";
import { addDays, dayLabel, validDay, validTime, zoneDay, zonedInstant, zoneTime, type AgendaItem, type AgendaKind } from "@/lib/agenda";
import type { SessionUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { documentAccess } from "@/server/guard";
import { notifyUser, recordActivity, touchDocument } from "@/server/journal";
import { cancelOutlookEvent, createOutlookEvent, type OutlookResult } from "@/server/microsoft";
import { dueDay, listDocuments } from "@/server/queries";
import { appOrigin } from "@/server/sharing";

export type AgendaInput = {
  kind: string;
  title: string;
  notes: string;
  location: string;
  day: string;
  time: string;
  endTime: string;
  online: boolean;
  outlook: boolean;
};

export function agendaHref(documentId: string) {
  return `/documents/${documentId}?onglet=agenda`;
}

type EventRow = {
  id: string;
  documentId: string;
  kind: string;
  title: string;
  notes: string;
  location: string;
  startsAt: Date;
  endsAt: Date | null;
  createdById: string | null;
  createdByName: string;
  outlookEventId: string;
  onlineUrl: string;
};

function toItem(event: EventRow, documentTitle: string, userId: string, isModerator: boolean): AgendaItem {
  return {
    id: event.id,
    documentId: event.documentId,
    documentTitle,
    kind: event.kind === "DEADLINE" ? "DEADLINE" : "MEETING",
    title: event.title,
    notes: event.notes,
    location: event.location,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    day: zoneDay(event.startsAt),
    time: zoneTime(event.startsAt),
    endTime: event.endsAt ? zoneTime(event.endsAt) : "",
    createdByName: event.createdByName,
    outlook: Boolean(event.outlookEventId),
    onlineUrl: event.onlineUrl,
    canDelete: isModerator || (Boolean(event.createdById) && event.createdById === userId),
  };
}

async function members(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      title: true,
      workspaceId: true,
      moderatorId: true,
      moderator: { select: { email: true, name: true } },
      stakeholders: { select: { userId: true, email: true, name: true, representative: true } },
    },
  });
  if (!document) return null;
  const ids = new Set<string>();
  if (document.moderatorId) ids.add(document.moderatorId);
  for (const stakeholder of document.stakeholders) if (stakeholder.userId) ids.add(stakeholder.userId);
  const emails = new Map<string, { email: string; name: string }>();
  const add = (email: string, name: string) => {
    const key = email.trim().toLowerCase();
    if (key && !emails.has(key)) emails.set(key, { email: email.trim(), name });
  };
  if (document.moderator) add(document.moderator.email, document.moderator.name);
  for (const stakeholder of document.stakeholders) add(stakeholder.email, stakeholder.representative || stakeholder.name);
  return { title: document.title, workspaceId: document.workspaceId, ids: [...ids], emails: [...emails.values()] };
}

export async function documentAgenda(user: SessionUser, documentId: string) {
  const access = await documentAccess(documentId, user);
  if (!access) return null;
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { title: true, dueDate: true, status: true, events: { orderBy: { startsAt: "asc" } } },
  });
  if (!document) return null;
  return {
    dueDate: dueDay(document.dueDate),
    status: document.status,
    canAdd: access.access.canComment,
    canEditDue: access.access.canEdit,
    events: document.events.map((event) => toItem(event, document.title, user.id, access.access.isModerator)),
  };
}

// Events and agreement deadlines of every agreement the user can read, between two days.
export async function userAgenda(user: SessionUser, from: string, to: string) {
  const documents = await listDocuments(user);
  const byId = new Map(documents.map((document) => [document.id, document]));
  const events = documents.length
    ? await prisma.agendaEvent.findMany({
        where: {
          documentId: { in: documents.map((document) => document.id) },
          startsAt: { gte: zonedInstant(from, "00:00"), lt: zonedInstant(addDays(to, 1), "00:00") },
        },
        orderBy: { startsAt: "asc" },
      })
    : [];
  return {
    events: events.map((event) => {
      const document = byId.get(event.documentId);
      return toItem(event, document?.title ?? "", user.id, document?.canManage ?? false);
    }),
    deadlines: documents
      .filter((document) => document.dueDate && document.dueDate >= from && document.dueDate <= to)
      .map((document) => ({ documentId: document.id, title: document.title, dueDate: document.dueDate as string, status: document.status }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    documents: documents
      .filter((document) => document.status !== "FINAL")
      .map((document) => ({ id: document.id, title: document.title, dueDate: document.dueDate, status: document.status })),
  };
}

function clockPlus(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = Math.min(hour * 60 + minute + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export async function createAgendaEvent(user: SessionUser, documentId: string, input: AgendaInput) {
  const access = await documentAccess(documentId, user);
  if (!access) return { ok: false as const, error: "Entente inaccessible." };
  if (!access.access.canComment) return { ok: false as const, error: "Votre accès est en lecture seule." };

  const kind: AgendaKind = input.kind === "DEADLINE" ? "DEADLINE" : "MEETING";
  const title = input.title.trim().slice(0, 160);
  if (title.length < 2) return { ok: false as const, error: kind === "MEETING" ? "Donnez un objet à la rencontre." : "Décrivez l'échéance." };
  if (!validDay(input.day)) return { ok: false as const, error: "Choisissez une date." };
  if (input.day < zoneDay(new Date())) return { ok: false as const, error: "La date ne peut pas être dans le passé." };
  const time = validTime(input.time) ? input.time : kind === "DEADLINE" ? "17:00" : "";
  if (!time) return { ok: false as const, error: "Choisissez l'heure de la rencontre." };
  let endTime = "";
  if (kind === "MEETING") {
    endTime = validTime(input.endTime) ? input.endTime : clockPlus(time, 60);
    if (endTime <= time) return { ok: false as const, error: "L'heure de fin doit suivre l'heure de début." };
  }

  const team = await members(documentId);
  if (!team) return { ok: false as const, error: "Entente inaccessible." };
  const notes = input.notes.trim().slice(0, 2000);
  const location = input.location.trim().slice(0, 200);

  let outlook: OutlookResult = { status: "skipped" };
  if (input.outlook) {
    const own = user.email.toLowerCase();
    outlook = await createOutlookEvent(user.id, {
      kind,
      title,
      notes,
      location,
      start: `${input.day}T${time}`,
      end: `${input.day}T${endTime || clockPlus(time, 30)}`,
      online: input.online,
      link: `${await appOrigin()}${agendaHref(documentId)}`,
      attendees: team.emails.filter((person) => person.email.toLowerCase() !== own),
    });
  }

  const event = await prisma.agendaEvent.create({
    data: {
      documentId,
      kind,
      title,
      notes,
      location,
      startsAt: zonedInstant(input.day, time),
      endsAt: endTime ? zonedInstant(input.day, endTime) : null,
      createdById: user.id,
      createdByName: user.name,
      outlookEventId: outlook.status === "created" ? outlook.eventId : "",
      onlineUrl: outlook.status === "created" ? outlook.joinUrl : "",
    },
  });

  const when = `${dayLabel(input.day)} à ${time.replace(":", " h ")}`;
  after(async () => {
    await recordActivity({
      workspaceId: team.workspaceId,
      documentId,
      actorId: user.id,
      actorName: user.name,
      kind: "AGENDA",
      message: kind === "MEETING"
        ? `${user.name} a planifié la rencontre « ${title} » le ${when}.`
        : `${user.name} a fixé l'échéance « ${title} » au ${when}.`,
    });
    for (const memberId of team.ids) {
      if (memberId === user.id) continue;
      await notifyUser({
        userId: memberId,
        kind: "AGENDA",
        title: kind === "MEETING" ? `Rencontre planifiée · ${team.title}` : `Nouvelle échéance · ${team.title}`,
        body: `${title} — ${when}`,
        href: agendaHref(documentId),
      });
    }
  });
  touchDocument(documentId);
  return {
    ok: true as const,
    event: toItem(event, team.title, user.id, access.access.isModerator),
    outlook: outlook.status,
    hint: outlook.status === "failed" ? outlook.hint : "",
  };
}

export async function deleteAgendaEvent(user: SessionUser, documentId: string, eventId: string) {
  const access = await documentAccess(documentId, user);
  if (!access) return { ok: false as const, error: "Entente inaccessible." };
  const event = await prisma.agendaEvent.findFirst({ where: { id: eventId, documentId } });
  if (!event) return { ok: false as const, error: "Événement introuvable." };
  if (!access.access.isModerator && event.createdById !== user.id) {
    return { ok: false as const, error: "Seuls l'auteur et le modérateur peuvent retirer cet événement." };
  }
  await prisma.agendaEvent.delete({ where: { id: event.id } });
  const team = await members(documentId);
  after(async () => {
    if (event.outlookEventId && event.createdById) await cancelOutlookEvent(event.createdById, event.outlookEventId);
    if (!team) return;
    const when = `${dayLabel(zoneDay(event.startsAt))} à ${zoneTime(event.startsAt).replace(":", " h ")}`;
    await recordActivity({
      workspaceId: team.workspaceId,
      documentId,
      actorId: user.id,
      actorName: user.name,
      kind: "AGENDA",
      message: `${user.name} a retiré « ${event.title} » (${when}) de l'agenda.`,
    });
    if (event.startsAt.getTime() < Date.now()) return;
    for (const memberId of team.ids) {
      if (memberId === user.id) continue;
      await notifyUser({
        userId: memberId,
        kind: "AGENDA",
        title: event.kind === "MEETING" ? `Rencontre annulée · ${team.title}` : `Échéance retirée · ${team.title}`,
        body: `${event.title} — ${when}`,
        href: agendaHref(documentId),
      });
    }
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function setDueDate(user: SessionUser, documentId: string, day: string) {
  const access = await documentAccess(documentId, user);
  if (!access) return { ok: false as const, error: "Entente inaccessible." };
  if (!access.access.canEdit) return { ok: false as const, error: "Seul le modérateur peut changer l'échéance." };
  if (!validDay(day)) return { ok: false as const, error: "Choisissez une date." };
  if (day < zoneDay(new Date())) return { ok: false as const, error: "L'échéance ne peut pas être dans le passé." };
  const team = await members(documentId);
  if (!team) return { ok: false as const, error: "Entente inaccessible." };
  await prisma.document.update({ where: { id: documentId }, data: { dueDate: new Date(`${day}T00:00:00Z`) } });
  after(async () => {
    await recordActivity({
      workspaceId: team.workspaceId,
      documentId,
      actorId: user.id,
      actorName: user.name,
      kind: "AGENDA",
      message: `${user.name} a fixé l'échéance de l'entente au ${dayLabel(day)}.`,
    });
    for (const memberId of team.ids) {
      if (memberId === user.id) continue;
      await notifyUser({
        userId: memberId,
        kind: "AGENDA",
        title: `Échéance modifiée · ${team.title}`,
        body: `Nouvelle échéance : ${dayLabel(day)}`,
        href: agendaHref(documentId),
      });
    }
  });
  touchDocument(documentId);
  return { ok: true as const, dueDate: day };
}
