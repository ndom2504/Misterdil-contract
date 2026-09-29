import { failure, mobileUser, reply } from "@/server/mobile";
import { getDocumentView } from "@/server/queries";

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
      workspaceName: view.workspaceName,
      moderatorId: view.moderatorId,
      moderatorName: view.moderatorName,
      currentUserId: view.currentUserId,
      loadedAt: view.loadedAt,
      sentAt: view.sentAt,
      progress: view.progress,
      access: view.access,
      sections: view.sections,
      stakeholders: view.stakeholders,
      invitationLinks: view.invitationLinks,
      discussions: view.discussions,
      activities: view.activities.slice(0, 30),
    },
  });
}
