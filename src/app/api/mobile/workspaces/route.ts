import { failure, mobileUser, reply } from "@/server/mobile";
import { listWorkspaces } from "@/server/queries";

export async function GET() {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const workspaces = await listWorkspaces(user);
  return reply({
    ok: true,
    workspaces: workspaces.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      sector: item.sector,
      role: item.role,
      participants: item.participants,
      documents: item.documents.length,
      progress: item.progress,
      canDelete: item.canDelete,
      updatedAt: item.updatedAt,
    })),
  });
}
