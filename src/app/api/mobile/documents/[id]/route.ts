import { deleteDocument } from "@/server/deletion";
import { failure, mobileUser, reply } from "@/server/mobile";
import { getDocumentView } from "@/server/queries";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const result = await deleteDocument(user, id);
  if (!result.ok) return failure(result.error, 403);
  return reply(result);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const view = await getDocumentView(user, id);
  if (!view) return failure("Document introuvable.", 404);
  return reply({
    ok: true,
    document: {
      id: view.id,
      title: view.title,
      typeLabel: view.typeLabel,
      status: view.status,
      color: view.color,
      workspaceId: view.workspaceId,
      workspaceName: view.workspaceName,
      moderatorId: view.moderatorId,
      moderatorName: view.moderatorName,
      moderatorAvatar: view.moderatorAvatar,
      currentUserId: view.currentUserId,
      loadedAt: view.loadedAt,
      sentAt: view.sentAt,
      dueDate: view.dueDate,
      progress: view.progress,
      access: view.access,
      sections: view.sections,
      stakeholders: view.stakeholders,
      invitationLinks: view.invitationLinks,
      discussions: view.discussions,
      activities: view.activities.slice(0, 30),
      readyForFinal: view.readyForFinal,
      partiesApproved: view.partiesApproved,
      approvals: view.approvals,
      signatures: view.signatures,
      attachments: view.attachments,
    },
  });
}
