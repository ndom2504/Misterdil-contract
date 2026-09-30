import { after } from "next/server";
import type { SessionUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { documentAccess } from "@/server/guard";
import { notifyUser, recordActivity, touchDocument } from "@/server/journal";
import { removeFile } from "@/server/storage";

export async function deleteDocument(user: SessionUser, documentId: string) {
  const loaded = await documentAccess(documentId, user);
  if (!loaded) return { ok: false as const, error: "Entente introuvable." };
  if (!loaded.access.isModerator) return { ok: false as const, error: "Seul le modérateur de l'entente peut la supprimer." };

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
  const base = `/documents/${documentId}`;

  // Attachments only lose their link when an agreement disappears, and notifications would
  // point to a missing page: both go with it. Activities stay in the workspace history.
  await prisma.$transaction([
    prisma.attachment.deleteMany({ where: { documentId } }),
    prisma.invitation.deleteMany({ where: { documentId, status: "PENDING" } }),
    prisma.notification.deleteMany({
      where: { OR: [{ href: base }, { href: { startsWith: `${base}?` } }, { href: { startsWith: `${base}/` } }] },
    }),
    prisma.document.delete({ where: { id: documentId } }),
  ]);

  const message = `${user.name} a supprimé l'entente « ${document.title} ».`;
  after(async () => {
    for (const file of files) await removeFile(file);
    await recordActivity({ workspaceId: document.workspaceId, actorId: user.id, actorName: user.name, kind: "DELETE", message });
    for (const memberId of members) {
      if (memberId === user.id) continue;
      await notifyUser({ userId: memberId, kind: "DELETE", title: "Entente supprimée", body: message, href: "/documents" });
    }
  });
  touchDocument(documentId);
  return { ok: true as const };
}
