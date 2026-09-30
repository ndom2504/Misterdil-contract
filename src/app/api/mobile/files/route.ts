import { prisma } from "@/server/db";
import { failure, mobileUser, reply } from "@/server/mobile";
import { listDocuments } from "@/server/queries";

export async function GET() {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const documents = await listDocuments(user);
  const ids = documents.map((document) => document.id);
  const [files, memberships] = await Promise.all([
    ids.length
      ? prisma.attachment.findMany({
          where: { documentId: { in: ids } },
          orderBy: { createdAt: "desc" },
          select: { id: true, documentId: true, name: true, mimeType: true, size: true, createdAt: true, uploadedBy: { select: { name: true } } },
        })
      : [],
    prisma.workspaceMember.findMany({ where: { userId: user.id }, select: { workspaceId: true, role: true } }),
  ]);
  const roles = new Map(memberships.map((item) => [item.workspaceId, item.role]));
  return reply({
    ok: true,
    ententes: documents.map((document) => ({
      id: document.id,
      title: document.title,
      typeLabel: document.typeLabel,
      status: document.status,
      workspaceId: document.workspaceId,
      canUpload: Boolean(roles.get(document.workspaceId)) && roles.get(document.workspaceId) !== "READER",
      files: files
        .filter((file) => file.documentId === document.id)
        .map((file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          createdAt: file.createdAt.toISOString(),
          uploadedByName: file.uploadedBy.name,
        })),
    })),
  });
}
