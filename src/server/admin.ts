import { randomBytes } from "node:crypto";
import { list } from "@vercel/blob";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { hashPassword } from "@/server/password";
import { blobConfigured, removeFile } from "@/server/storage";

export const PAGE_SIZE = 50;

function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function adminStats() {
  const [users, users7, users30, disabled, onboarded, workspaces, documents, byStatus, messages7, invitations, signed, recentUsers, activities] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: daysAgo(7) } } }),
      prisma.user.count({ where: { createdAt: { gte: daysAgo(30) } } }),
      prisma.user.count({ where: { disabledAt: { not: null } } }),
      prisma.user.count({ where: { onboarded: true } }),
      prisma.workspace.count(),
      prisma.document.count(),
      prisma.document.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.message.count({ where: { createdAt: { gte: daysAgo(7) } } }),
      prisma.invitation.count({ where: { status: "PENDING" } }),
      prisma.signature.count({ where: { signedAt: { not: null } } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, name: true, email: true, createdAt: true, organization: { select: { name: true } } },
      }),
      prisma.activity.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { id: true, actorName: true, message: true, createdAt: true, workspace: { select: { name: true } } },
      }),
    ]);
  return {
    users,
    users7,
    users30,
    disabled,
    onboarded,
    workspaces,
    documents,
    byStatus: byStatus.map((item) => ({ status: item.status, count: item._count._all })).sort((a, b) => b.count - a.count),
    messages7,
    invitations,
    signed,
    recentUsers,
    activities,
  };
}

export async function adminUsers(q: string, page: number) {
  const where = q ? { OR: [{ name: contains(q) }, { email: contains(q) }, { organization: { name: contains(q) } }] } : {};
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        onboarded: true,
        disabledAt: true,
        createdAt: true,
        organization: { select: { name: true } },
        microsoft: { select: { email: true } },
        _count: { select: { memberships: true, documents: true } },
      },
    }),
  ]);
  return { total, rows };
}

export async function adminWorkspaces(q: string, page: number) {
  const where = q ? { OR: [{ name: contains(q) }, { organization: { name: contains(q) } }] } : {};
  const [total, rows] = await Promise.all([
    prisma.workspace.count({ where }),
    prisma.workspace.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        createdAt: true,
        organization: { select: { name: true } },
        _count: { select: { members: true, documents: true, attachments: true } },
      },
    }),
  ]);
  return { total, rows };
}

export async function adminDocuments(q: string, page: number) {
  const where = q ? { OR: [{ title: contains(q) }, { workspace: { name: contains(q) } }, { moderator: { name: contains(q) } }] } : {};
  const [total, rows] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        type: { select: { label: true } },
        workspace: { select: { name: true } },
        moderator: { select: { name: true } },
        _count: { select: { stakeholders: true, messages: true } },
      },
    }),
  ]);
  return { total, rows };
}

export async function adminInvitations(q: string, page: number) {
  const where = { status: "PENDING", ...(q ? { OR: [{ email: contains(q) }, { workspace: { name: contains(q) } }] } : {}) };
  const [total, rows] = await Promise.all([
    prisma.invitation.count({ where }),
    prisma.invitation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        role: true,
        documentId: true,
        sentAt: true,
        createdAt: true,
        workspace: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    }),
  ]);
  const ids = [...new Set(rows.map((row) => row.documentId).filter(Boolean))];
  const documents = ids.length ? await prisma.document.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } }) : [];
  const titles = new Map(documents.map((item) => [item.id, item.title]));
  return { total, rows: rows.map((row) => ({ ...row, documentTitle: titles.get(row.documentId) ?? "" })) };
}

type StoredFile = { id: string; name: string; size: number; kind: "Pièce jointe" | "Discussion"; place: string; owner: string; createdAt: Date };

// Blob storage totals come from the store itself, capped so a huge store cannot stall the page.
async function blobUsage() {
  if (!blobConfigured()) return null;
  const folders = new Map<string, { count: number; size: number }>();
  let cursor: string | undefined;
  let pages = 0;
  try {
    do {
      const result = await list({ cursor, limit: 1000 });
      for (const blob of result.blobs) {
        const folder = blob.pathname.split("/")[0] || "(racine)";
        const entry = folders.get(folder) ?? { count: 0, size: 0 };
        entry.count += 1;
        entry.size += blob.size;
        folders.set(folder, entry);
      }
      cursor = result.hasMore ? result.cursor : undefined;
      pages += 1;
    } while (cursor && pages < 20);
  } catch (error) {
    console.error("[admin] lecture du stockage", error instanceof Error ? error.message : error);
    return { error: "Le stockage Vercel Blob n'a pas pu être lu.", folders: [], partial: false };
  }
  return {
    error: "",
    partial: Boolean(cursor),
    folders: [...folders.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.size - a.size),
  };
}

export async function adminStorage() {
  const [attachments, chat, avatars, bigAttachments, bigChat, blob] = await Promise.all([
    prisma.attachment.aggregate({ _count: { _all: true }, _sum: { size: true } }),
    prisma.message.aggregate({ where: { kind: "FILE" }, _count: { _all: true }, _sum: { fileSize: true } }),
    prisma.user.count({ where: { avatarPath: { not: "" } } }),
    prisma.attachment.findMany({
      orderBy: { size: "desc" },
      take: 20,
      select: { id: true, name: true, size: true, createdAt: true, workspace: { select: { name: true } }, document: { select: { title: true } }, uploadedBy: { select: { name: true } } },
    }),
    prisma.message.findMany({
      where: { kind: "FILE" },
      orderBy: { fileSize: "desc" },
      take: 20,
      select: { id: true, fileName: true, fileSize: true, createdAt: true, authorName: true, document: { select: { title: true } } },
    }),
    blobUsage(),
  ]);
  const largest: StoredFile[] = [
    ...bigAttachments.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      kind: "Pièce jointe" as const,
      place: item.document?.title ?? item.workspace.name,
      owner: item.uploadedBy.name,
      createdAt: item.createdAt,
    })),
    ...bigChat.map((item) => ({
      id: item.id,
      name: item.fileName,
      size: item.fileSize,
      kind: "Discussion" as const,
      place: item.document.title,
      owner: item.authorName,
      createdAt: item.createdAt,
    })),
  ]
    .sort((a, b) => b.size - a.size)
    .slice(0, 20);
  return {
    attachments: { count: attachments._count._all, size: attachments._sum.size ?? 0 },
    chat: { count: chat._count._all, size: chat._sum.fileSize ?? 0 },
    avatars,
    largest,
    blob,
  };
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return { ok: false as const, error: "Compte introuvable." };
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { disabledAt: disabled ? new Date() : null } }),
    // A disabled account must stop receiving push notifications on its devices.
    ...(disabled ? [prisma.pushToken.deleteMany({ where: { userId } })] : []),
  ]);
  revalidatePath("/admin", "layout");
  return { ok: true as const };
}

// Accounts that created agreements, approved sections, uploaded files or sent invitations are
// referenced by records other parties still rely on: they are anonymized instead of removed.
export async function deleteUserAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      avatarPath: true,
      _count: { select: { documents: true, approvals: true, uploads: true, invitationsSent: true } },
    },
  });
  if (!user) return { ok: false as const, error: "Compte introuvable." };
  const referenced = user._count.documents + user._count.approvals + user._count.uploads + user._count.invitationsSent > 0;

  if (!referenced) {
    await prisma.user.delete({ where: { id: userId } });
  } else {
    await prisma.$transaction([
      prisma.workspaceMember.deleteMany({ where: { userId } }),
      prisma.pushToken.deleteMany({ where: { userId } }),
      prisma.microsoftAccount.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.presence.deleteMany({ where: { userId } }),
      prisma.chatClear.deleteMany({ where: { userId } }),
      prisma.stakeholder.updateMany({ where: { userId }, data: { userId: null } }),
      prisma.invitation.deleteMany({ where: { invitedById: userId, status: "PENDING" } }),
      prisma.user.update({
        where: { id: userId },
        data: {
          email: `supprime-${userId}@misterdil.invalid`,
          name: "Compte supprimé",
          passwordHash: await hashPassword(randomBytes(32).toString("hex")),
          phone: null,
          jobTitle: null,
          avatarPath: "",
          onboarded: false,
          disabledAt: new Date(),
        },
      }),
    ]);
  }
  if (user.avatarPath) after(() => removeFile(user.avatarPath));
  revalidatePath("/", "layout");
  return { ok: true as const, anonymized: referenced };
}

export async function cancelInvitation(invitationId: string) {
  const deleted = await prisma.invitation.deleteMany({ where: { id: invitationId, status: "PENDING" } });
  revalidatePath("/admin", "layout");
  return deleted.count ? { ok: true as const } : { ok: false as const, error: "Invitation introuvable ou déjà acceptée." };
}
