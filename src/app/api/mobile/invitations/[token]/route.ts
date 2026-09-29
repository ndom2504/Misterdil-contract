import { acceptInvitationToken, invitationPreview } from "@/server/invitations";
import { failure, mobileUser, reply } from "@/server/mobile";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const preview = await invitationPreview(token);
  if (!preview) return failure("Invitation introuvable.", 404);
  return reply({ ok: true, invitation: preview });
}

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  if (!token || token.length > 64) return failure("Invitation introuvable.", 404);
  const invitation = await acceptInvitationToken(token, { id: user.id, name: user.name });
  if (!invitation || invitation.status === "REVOKED") return failure("Cette invitation n'est plus valide.", 410);
  return reply({ ok: true, documentId: invitation.documentId, onboarded: user.onboarded });
}
