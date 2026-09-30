import { after } from "next/server";
import { avatarUrl, type SessionUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { documentAccess } from "@/server/guard";
import { notifyUser, recordActivity } from "@/server/journal";
import { callParticipants, callToken, livekitConfigured } from "@/server/livekit";
import { REACTIONS } from "@/lib/palette";
import { sendPush } from "@/server/push";
import { listDocuments } from "@/server/queries";

export type ChatMessage = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorAvatar: string;
  body: string;
  kind: string;
  createdAt: string;
};

const HISTORY = 100;
const MAX_LENGTH = 2000;

export function chatHref(documentId: string, call = false) {
  return `/documents/${documentId}?onglet=discussion${call ? "&appel=1" : ""}`;
}

async function documentHeader(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { title: true, workspaceId: true, moderatorId: true, stakeholders: { select: { userId: true } } },
  });
  if (!document) return null;
  const members = new Set<string>();
  if (document.moderatorId) members.add(document.moderatorId);
  for (const stakeholder of document.stakeholders) if (stakeholder.userId) members.add(stakeholder.userId);
  return { title: document.title, workspaceId: document.workspaceId, members: [...members] };
}

const messageSelect = {
  id: true,
  authorId: true,
  authorName: true,
  body: true,
  kind: true,
  createdAt: true,
  author: { select: { id: true, avatarPath: true, updatedAt: true } },
} as const;

function toMessage(item: {
  id: string;
  authorId: string | null;
  authorName: string;
  body: string;
  kind: string;
  createdAt: Date;
  author: { id: string; avatarPath: string; updatedAt: Date } | null;
}): ChatMessage {
  return {
    id: item.id,
    authorId: item.authorId,
    authorName: item.authorName,
    authorAvatar: item.author ? avatarUrl(item.author) : "",
    body: item.body,
    kind: item.kind,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function listConversations(user: SessionUser) {
  const documents = await listDocuments(user);
  const latest = documents.length
    ? await prisma.message.findMany({
        where: { documentId: { in: documents.map((document) => document.id) } },
        orderBy: { createdAt: "desc" },
        distinct: ["documentId"],
        select: { documentId: true, authorId: true, authorName: true, body: true, kind: true, createdAt: true },
      })
    : [];
  const byDocument = new Map(latest.map((item) => [item.documentId, item]));
  return documents
    .map((document) => {
      const last = byDocument.get(document.id);
      return {
        documentId: document.id,
        title: document.title,
        typeLabel: document.typeLabel,
        status: document.status,
        participants: document.participants,
        lastMessage: last
          ? { authorName: last.authorId === user.id ? "Vous" : last.authorName, body: last.body, kind: last.kind, createdAt: last.createdAt.toISOString() }
          : null,
        updatedAt: last ? last.createdAt.toISOString() : document.updatedAt,
      };
    })
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

export async function callStatus(documentId: string) {
  const participants = await callParticipants(documentId);
  return { configured: livekitConfigured(), active: participants.length > 0, participants };
}

export type ReactionSummary = { emoji: string; count: number; userIds: string[]; names: string[] };

// Reactions come back on every poll, whatever the cursor, because a reaction added
// or removed on an older message would otherwise never reach the other clients.
async function reactionMap(documentId: string, messageId?: string) {
  const rows = await prisma.messageReaction.findMany({
    where: messageId ? { messageId } : { message: { documentId } },
    orderBy: { createdAt: "asc" },
    take: 1000,
    select: { messageId: true, emoji: true, userId: true, user: { select: { name: true } } },
  });
  const map: Record<string, ReactionSummary[]> = {};
  for (const row of rows) {
    const list = (map[row.messageId] ??= []);
    let entry = list.find((item) => item.emoji === row.emoji);
    if (!entry) {
      entry = { emoji: row.emoji, count: 0, userIds: [], names: [] };
      list.push(entry);
    }
    entry.count += 1;
    entry.userIds.push(row.userId);
    entry.names.push(row.user.name);
  }
  return map;
}

export async function toggleReaction(user: SessionUser, documentId: string, messageId: string, emoji: string) {
  const access = await documentAccess(documentId, user);
  if (!access) return { ok: false as const, error: "Conversation inaccessible." };
  if (!(REACTIONS as readonly string[]).includes(emoji)) return { ok: false as const, error: "Réaction inconnue." };
  const message = await prisma.message.findFirst({
    where: { id: messageId, documentId },
    select: { id: true, authorId: true, body: true, kind: true },
  });
  if (!message) return { ok: false as const, error: "Message introuvable." };

  const removed = await prisma.messageReaction.deleteMany({ where: { messageId, userId: user.id, emoji } });
  if (!removed.count) {
    await prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId: user.id, emoji } },
      update: {},
      create: { messageId, userId: user.id, emoji },
    });
    const authorId = message.authorId;
    if (authorId && authorId !== user.id) {
      after(async () => {
        const header = await documentHeader(documentId);
        const preview = message.body.length > 60 ? `${message.body.slice(0, 57)}...` : message.body;
        await notifyUser({
          userId: authorId,
          kind: "REACTION",
          title: `${user.name} a réagi ${emoji}`,
          body: `À votre message « ${preview} »${header ? ` dans « ${header.title} »` : ""}.`,
          href: chatHref(documentId),
        });
      });
    }
  }
  const reactions = (await reactionMap(documentId, messageId))[messageId] ?? [];
  return { ok: true as const, reactions };
}

// `after` is inclusive so messages written in the same millisecond are never skipped; clients dedupe by id.
export async function listMessages(user: SessionUser, documentId: string, after?: string) {
  const access = await documentAccess(documentId, user);
  if (!access) return null;
  const since = after ? new Date(after) : null;
  const rows =
    since && !Number.isNaN(since.getTime())
      ? await prisma.message.findMany({
          where: { documentId, createdAt: { gte: since } },
          orderBy: { createdAt: "asc" },
          take: HISTORY,
          select: messageSelect,
        })
      : (
          await prisma.message.findMany({
            where: { documentId },
            orderBy: { createdAt: "desc" },
            take: HISTORY,
            select: messageSelect,
          })
        ).reverse();
  const [document, call, reactions] = await Promise.all([
    since ? null : prisma.document.findUnique({ where: { id: documentId }, select: { title: true } }),
    callStatus(documentId),
    reactionMap(documentId),
  ]);
  return {
    ...(document ? { title: document.title } : {}),
    messages: rows.map(toMessage),
    reactions,
    call,
    serverTime: new Date().toISOString(),
  };
}

export async function postMessage(user: SessionUser, documentId: string, text: string) {
  const access = await documentAccess(documentId, user);
  if (!access) return { ok: false as const, error: "Conversation inaccessible." };
  const body = text.trim().slice(0, MAX_LENGTH);
  if (!body) return { ok: false as const, error: "Écrivez un message." };
  const header = await documentHeader(documentId);
  if (!header) return { ok: false as const, error: "Conversation inaccessible." };

  const created = await prisma.message.create({
    data: { documentId, authorId: user.id, authorName: user.name, body },
    select: messageSelect,
  });
  after(async () => {
    const preview = body.length > 140 ? `${body.slice(0, 137)}...` : body;
    for (const memberId of header.members) {
      if (memberId === user.id) continue;
      await sendPush(memberId, { title: `${user.name} · ${header.title}`, body: preview, href: chatHref(documentId), kind: "MESSAGE" });
    }
  });
  return { ok: true as const, message: toMessage(created) };
}

export async function startCall(user: SessionUser, documentId: string) {
  const access = await documentAccess(documentId, user);
  if (!access) return { ok: false as const, error: "Conversation inaccessible." };
  if (!livekitConfigured()) return { ok: false as const, error: "Les appels audio ne sont pas encore configurés sur le serveur." };
  const header = await documentHeader(documentId);
  if (!header) return { ok: false as const, error: "Conversation inaccessible." };

  const [joined, credentials] = await Promise.all([callParticipants(documentId, true), callToken(documentId, user)]);
  if (!credentials) return { ok: false as const, error: "Les appels audio ne sont pas encore configurés sur le serveur." };

  if (joined.length === 0) {
    await prisma.message.create({
      data: { documentId, authorId: user.id, authorName: user.name, body: `${user.name} a lancé un appel audio.`, kind: "CALL" },
    });
    after(async () => {
      await recordActivity({
        workspaceId: header.workspaceId,
        documentId,
        actorId: user.id,
        actorName: user.name,
        kind: "CALL",
        message: `${user.name} a lancé un appel audio.`,
      });
      for (const memberId of header.members) {
        if (memberId === user.id) continue;
        await notifyUser({
          userId: memberId,
          kind: "CALL",
          title: "Appel audio",
          body: `${user.name} vous appelle dans « ${header.title} ».`,
          href: chatHref(documentId, true),
        });
      }
    });
  }
  return { ok: true as const, ...credentials, title: header.title };
}
