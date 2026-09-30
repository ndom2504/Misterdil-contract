import { createAgreement } from "@/server/actions/documents";
import { failure, mobileUser, partiesFrom, readJson, reply } from "@/server/mobile";
import { listDocuments } from "@/server/queries";

export async function GET() {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const documents = await listDocuments(user);
  return reply({
    ok: true,
    documents: documents.map((item) => ({
      id: item.id,
      title: item.title,
      typeLabel: item.typeLabel,
      status: item.status,
      updatedAt: item.updatedAt,
      workspaceName: item.workspaceName,
      moderatorName: item.moderatorName,
      participants: item.participants,
      progress: item.progress,
      owned: item.owned,
      canManage: item.canManage,
      color: item.color,
      dueDate: item.dueDate,
    })),
  });
}

export async function POST(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ workspaceId: string; typeId: string; title: string; dueDate: string; parties: unknown }>(request);
  const result = await createAgreement({
    workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : "",
    typeId: typeof body.typeId === "string" ? body.typeId : "",
    title: typeof body.title === "string" ? body.title.slice(0, 200) : "",
    dueDate: typeof body.dueDate === "string" ? body.dueDate : "",
    parties: partiesFrom(body.parties),
  });
  if (!result.ok) return failure(result.error);
  return reply(result, 201);
}
