import type { Invitation } from "@prisma/client";
import { prisma } from "@/server/db";
import { notifyUser, recordActivity } from "@/server/journal";

async function acceptOne(invitation: Invitation, user: { id: string; name: string }) {
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } },
    update: {},
    create: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role },
  });
  if (invitation.documentId) {
    await prisma.stakeholder.updateMany({
      where: { documentId: invitation.documentId, email: invitation.email, userId: null },
      data: { userId: user.id },
    });
  }
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED", acceptedById: user.id },
  });
  if (invitation.documentId && invitation.invitedById !== user.id) {
    await notifyUser({
      userId: invitation.invitedById,
      kind: "INVITE",
      title: `${user.name} a rejoint l'entente`,
      body: "Son compte est créé. Vous pouvez travailler ensemble sur le document.",
      href: `/documents/${invitation.documentId}`,
    });
    await recordActivity({
      workspaceId: invitation.workspaceId,
      documentId: invitation.documentId,
      actorId: user.id,
      actorName: user.name,
      kind: "INVITE",
      message: `${user.name} a accepté l'invitation.`,
    });
  }
}

export async function acceptInvitations(userId: string, email: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  if (!user) return;
  const invitations = await prisma.invitation.findMany({
    where: { email: email.toLowerCase(), status: "PENDING" },
  });
  for (const invitation of invitations) await acceptOne(invitation, user);
}

// The link was sent to the invited address, so whoever opens it while signed in
// takes the invited seat, even if their account uses another email.
export async function acceptInvitationToken(token: string, user: { id: string; name: string }) {
  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) return null;
  if (invitation.status === "PENDING") await acceptOne(invitation, user);
  else if (invitation.acceptedById && invitation.acceptedById !== user.id) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } },
    });
    if (!member) return null;
  }
  return invitation;
}

// What the public invitation page may show: who invites, to what, and between whom.
// No email or phone of the other parties.
export async function invitationPreview(token: string) {
  if (!token || token.length > 64) return null;
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      invitedBy: { select: { name: true, organization: { select: { name: true } } } },
      workspace: { select: { name: true } },
    },
  });
  if (!invitation) return null;
  const document = invitation.documentId
    ? await prisma.document.findUnique({
        where: { id: invitation.documentId },
        select: {
          title: true,
          type: { select: { label: true } },
          stakeholders: { select: { name: true, organization: true, representative: true, partyType: true }, orderBy: { createdAt: "asc" } },
        },
      })
    : null;
  return {
    status: invitation.status,
    email: invitation.email,
    inviterName: invitation.invitedBy.name,
    inviterOrganization: invitation.invitedBy.organization?.name ?? "",
    workspaceName: invitation.workspace.name,
    title: document?.title ?? invitation.workspace.name,
    typeLabel: document?.type.label ?? "",
    parties: (document?.stakeholders ?? []).map((party) => ({
      name: party.representative || party.name,
      organization: party.organization,
      partyType: party.partyType,
    })),
  };
}

export async function findInvitation(token: string) {
  if (!token || token.length > 64) return null;
  return prisma.invitation.findUnique({
    where: { token },
    include: { invitedBy: { select: { name: true, organization: { select: { name: true } } } } },
  });
}
