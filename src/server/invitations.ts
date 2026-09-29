import { prisma } from "@/server/db";

export async function acceptInvitations(userId: string, email: string) {
  const invitations = await prisma.invitation.findMany({
    where: { email, status: "PENDING" },
  });
  for (const invitation of invitations) {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
      update: {},
      create: { workspaceId: invitation.workspaceId, userId, role: invitation.role },
    });
    if (invitation.documentId) {
      await prisma.stakeholder.updateMany({
        where: { documentId: invitation.documentId, email },
        data: { userId },
      });
    }
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    });
  }
}
