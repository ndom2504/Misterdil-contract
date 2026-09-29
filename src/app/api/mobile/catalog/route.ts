import { DOCUMENT_TYPES } from "@/lib/catalog";
import { ACCESS_ROLES, PARTY_TYPES } from "@/lib/domain";
import { prisma } from "@/server/db";
import { failure, mobileUser, reply } from "@/server/mobile";

export async function GET() {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id, role: { in: ["ADMINISTRATOR", "CREATOR", "MODERATOR"] } },
    include: { workspace: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return reply({
    ok: true,
    types: DOCUMENT_TYPES.map((type) => ({ id: type.id, label: type.label, description: type.description })),
    partyTypes: PARTY_TYPES,
    accessRoles: ACCESS_ROLES,
    workspaces: memberships.map((item) => item.workspace),
  });
}
