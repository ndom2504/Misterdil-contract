import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { can } from "@/server/access";
import type { SessionUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { documentAccess } from "@/server/guard";
import { notifyUser, recordActivity, touchDocument } from "@/server/journal";
import { removeFile } from "@/server/storage";

// Who deleted: a member of the agreement, or the Misterdil administration (id null).
export type Remover = { id: string | null; name: string };

export const ADMINISTRATION: Remover = { id: null, name: "L'administration Misterdil" };

function linksTo(base: string) {
  return [{ href: base }, { href: { startsWith: `${base}?` } }, { href: { startsWith: `${base}/` } }];
}

export async function deleteDocument(user: SessionUser, documentId: string) {
  const loaded = await documentAccess(documentId, user);
  if (!loaded) return { ok: false as const, error: "Entente introuvable." };
  if (!loaded.access.isModerator) return { ok: false as const, error: "Seul le modérateur de l'entente peut la supprimer." };
  return removeDocument(documentId, { id: user.id, name: user.name });
}

// No permission check: callers decide who may delete.
export async function removeDocument(documentId: string, remover: Remover) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      title: true,
      workspaceId: true,
      moderatorId: true,
      stakeholders: { select: { userId: true } },
      attachments: { select: { storagePath: true } },
      messages: { where: { filePath: { not: "" } }, select: { filePath: true } },
    },
  });
  if (!document) return { ok: false as const, error: "Entente introuvable." };

  const members = new Set<string>();
  if (document.moderatorId) members.add(document.moderatorId);
  for (const stakeholder of document.stakeholders) if (stakeholder.userId) members.add(stakeholder.userId);
  const files = [...document.attachments.map((item) => item.storagePath), ...document.messages.map((item) => item.filePath)];

  // Attachments only lose their link when an agreement disappears, and notifications would
  // point to a missing page: both go with it. Activities stay in the workspace history.
  await prisma.$transaction([
    prisma.attachment.deleteMany({ where: { documentId } }),
    prisma.invitation.deleteMany({ where: { documentId, status: "PENDING" } }),
    prisma.notification.deleteMany({ where: { OR: linksTo(`/documents/${documentId}`) } }),
    prisma.document.delete({ where: { id: documentId } }),
  ]);

  const message = `${remover.name} a supprimé l'entente « ${document.title} ».`;
  after(async () => {
    for (const file of files) await removeFile(file);
    await recordActivity({ workspaceId: document.workspaceId, actorId: remover.id, actorName: remover.name, kind: "DELETE", message });
    for (const memberId of members) {
      if (memberId === remover.id) continue;
      await notifyUser({ userId: memberId, kind: "DELETE", title: "Entente supprimée", body: message, href: "/documents" });
    }
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function deleteWorkspace(user: SessionUser, workspaceId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    select: { role: true },
  });
  if (!membership) return { ok: false as const, error: "Espace introuvable." };
  if (!can(membership.role, "workspace.manage")) {
    return { ok: false as const, error: "Seul l'administrateur ou le créateur de l'espace peut le supprimer." };
  }
  return removeWorkspace(workspaceId, { id: user.id, name: user.name });
}

// Documents, attachments, invitations and memberships cascade with the workspace.
export async function removeWorkspace(workspaceId: string, remover: Remover) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      name: true,
      members: { select: { userId: true } },
      attachments: { select: { storagePath: true } },
      documents: {
        select: {
          id: true,
          moderatorId: true,
          stakeholders: { select: { userId: true } },
          messages: { where: { filePath: { not: "" } }, select: { filePath: true } },
        },
      },
    },
  });
  if (!workspace) return { ok: false as const, error: "Espace introuvable." };

  const members = new Set(workspace.members.map((item) => item.userId));
  for (const document of workspace.documents) {
    if (document.moderatorId) members.add(document.moderatorId);
    for (const stakeholder of document.stakeholders) if (stakeholder.userId) members.add(stakeholder.userId);
  }
  const files = [
    ...workspace.attachments.map((item) => item.storagePath),
    ...workspace.documents.flatMap((document) => document.messages.map((item) => item.filePath)),
  ];
  const links = [`/espaces/${workspaceId}`, ...workspace.documents.map((document) => `/documents/${document.id}`)].flatMap(linksTo);

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { OR: links } }),
    prisma.workspace.delete({ where: { id: workspaceId } }),
  ]);

  const count = workspace.documents.length;
  const message = `${remover.name} a supprimé l'espace « ${workspace.name} »${count ? ` et ses ${count} entente${count > 1 ? "s" : ""}` : ""}.`;
  after(async () => {
    for (const file of files) await removeFile(file);
    for (const memberId of members) {
      if (memberId === remover.id) continue;
      await notifyUser({ userId: memberId, kind: "DELETE", title: "Espace supprimé", body: message, href: "/espaces" });
    }
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
