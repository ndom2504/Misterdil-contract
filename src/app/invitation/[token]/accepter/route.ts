import { NextResponse } from "next/server";
import { onboardingPath } from "@/lib/next-path";
import { getCurrentUser } from "@/server/current-user";
import { acceptInvitationToken } from "@/server/invitations";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const here = `/invitation/${encodeURIComponent(token)}`;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/inscription?suivant=${encodeURIComponent(`${here}/accepter`)}`, request.url));
  }

  const invitation = token.length <= 64 ? await acceptInvitationToken(token, user) : null;
  if (!invitation || invitation.status === "REVOKED") {
    return NextResponse.redirect(new URL(here, request.url));
  }

  const target = invitation.documentId ? `/documents/${invitation.documentId}` : `/espaces/${invitation.workspaceId}`;
  return NextResponse.redirect(new URL(user.onboarded ? target : onboardingPath(target), request.url));
}
