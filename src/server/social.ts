import { after } from "next/server";
import { cleanColor } from "@/lib/palette";
import { avatarUrl, type SessionUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { documentAccess } from "@/server/guard";
import { notifyUser } from "@/server/journal";

export type SectionPerson = { id: string; name: string; avatarUrl: string };
export type SectionSocial = { likes: number; liked: boolean; views: number; comments: number; people: SectionPerson[] };

const PEOPLE = 6;

export function sectionHref(documentId: string, sectionId: string) {
  return `/documents/${documentId}?section=${sectionId}`;
}

async function members(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { title: true, moderatorId: true, stakeholders: { select: { userId: true } } },
  });
  if (!document) return null;
  const ids = new Set<string>();
  if (document.moderatorId) ids.add(document.moderatorId);
  for (const stakeholder of document.stakeholders) if (stakeholder.userId) ids.add(stakeholder.userId);
  return { title: document.title, ids: [...ids] };
}

async function sectionOf(documentId: string, sectionId: string) {
  return prisma.documentSection.findFirst({
    where: { id: sectionId, documentId },
    select: { id: true, title: true, updatedAt: true },
  });
}

// People are the likers first (most recent), then the commenters, so the avatars
// show who actually reacted to the section.
export async function sectionSocial(
  userId: string,
  sectionIds: string[],
  commenters: Map<string, { count: number; authorIds: string[] }>,
): Promise<Map<string, SectionSocial>> {
  const result = new Map<string, SectionSocial>();
  if (!sectionIds.length) return result;
  const [likes, views] = await Promise.all([
    prisma.sectionLike.findMany({
      where: { sectionId: { in: sectionIds } },
      orderBy: { createdAt: "desc" },
      select: { sectionId: true, userId: true },
    }),
    prisma.sectionView.groupBy({ by: ["sectionId"], where: { sectionId: { in: sectionIds } }, _count: { _all: true } }),
  ]);
  const userIds = new Set<string>(likes.map((item) => item.userId));
  for (const entry of commenters.values()) for (const id of entry.authorIds) userIds.add(id);
  const users = userIds.size
    ? await prisma.user.findMany({
        where: { id: { in: [...userIds] } },
        select: { id: true, name: true, avatarPath: true, updatedAt: true },
      })
    : [];
  const byId = new Map(users.map((item) => [item.id, { id: item.id, name: item.name, avatarUrl: avatarUrl(item) }]));
  const viewCount = new Map(views.map((item) => [item.sectionId, item._count._all]));

  for (const sectionId of sectionIds) {
    const sectionLikes = likes.filter((item) => item.sectionId === sectionId);
    const thread = commenters.get(sectionId);
    const ordered = [...new Set([...sectionLikes.map((item) => item.userId), ...(thread?.authorIds ?? [])])];
    result.set(sectionId, {
      likes: sectionLikes.length,
      liked: sectionLikes.some((item) => item.userId === userId),
      views: viewCount.get(sectionId) ?? 0,
      comments: thread?.count ?? 0,
      people: ordered
        .map((id) => byId.get(id))
        .filter((item): item is SectionPerson => Boolean(item))
        .slice(0, PEOPLE),
    });
  }
  return result;
}

export async function setDocumentColor(user: SessionUser, documentId: string, value: unknown) {
  const loaded = await documentAccess(documentId, user);
  if (!loaded?.access.canWrite) return { ok: false as const, error: "Vous ne pouvez pas modifier cette entente." };
  const color = cleanColor(value);
  const current = await prisma.document.findUnique({ where: { id: documentId }, select: { updatedAt: true } });
  if (!current) return { ok: false as const, error: "Entente introuvable." };
  // A colour is a label, not an edit: keep updatedAt so the list order and edit conflicts are unaffected.
  await prisma.document.update({ where: { id: documentId }, data: { color, updatedAt: current.updatedAt } });
  return { ok: true as const, color };
}

export async function setSectionColor(user: SessionUser, documentId: string, sectionId: string, value: unknown) {
  const loaded = await documentAccess(documentId, user);
  if (!loaded?.access.canWrite) return { ok: false as const, error: "Vous ne pouvez pas modifier cette section." };
  const section = await sectionOf(documentId, sectionId);
  if (!section) return { ok: false as const, error: "Section introuvable." };
  const color = cleanColor(value);
  // Autosave compares updatedAt to detect concurrent edits, so a colour change must not move it.
  await prisma.documentSection.update({ where: { id: sectionId }, data: { color, updatedAt: section.updatedAt } });
  return { ok: true as const, color };
}

export async function toggleSectionLike(user: SessionUser, documentId: string, sectionId: string) {
  const loaded = await documentAccess(documentId, user);
  if (!loaded) return { ok: false as const, error: "Section inaccessible." };
  const section = await sectionOf(documentId, sectionId);
  if (!section) return { ok: false as const, error: "Section introuvable." };

  const key = { sectionId_userId: { sectionId, userId: user.id } };
  const existing = await prisma.sectionLike.findUnique({ where: key, select: { id: true } });
  if (existing) {
    await prisma.sectionLike.deleteMany({ where: { sectionId, userId: user.id } });
  } else {
    await prisma.sectionLike.upsert({ where: key, update: {}, create: { sectionId, userId: user.id } });
    after(async () => {
      const group = await members(documentId);
      if (!group) return;
      for (const memberId of group.ids) {
        if (memberId === user.id) continue;
        await notifyUser({
          userId: memberId,
          kind: "REACTION",
          title: "Nouvelle réaction",
          body: `${user.name} aime la section « ${section.title} » de « ${group.title} ».`,
          href: sectionHref(documentId, sectionId),
        });
      }
    });
  }
  const likes = await prisma.sectionLike.count({ where: { sectionId } });
  return { ok: true as const, liked: !existing, likes };
}

export async function recordSectionView(user: SessionUser, documentId: string, sectionId: string) {
  const loaded = await documentAccess(documentId, user);
  if (!loaded) return { ok: false as const, error: "Section inaccessible." };
  const section = await sectionOf(documentId, sectionId);
  if (!section) return { ok: false as const, error: "Section introuvable." };
  await prisma.sectionView.upsert({
    where: { sectionId_userId: { sectionId, userId: user.id } },
    update: { viewedAt: new Date() },
    create: { sectionId, userId: user.id },
  });
  const views = await prisma.sectionView.count({ where: { sectionId } });
  return { ok: true as const, views };
}
