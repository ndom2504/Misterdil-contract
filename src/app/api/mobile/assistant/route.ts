import { askMisterdil } from "@/server/assistant";
import { failure, mobileUser, readJson, reply } from "@/server/mobile";
import { assistantHistory } from "@/server/queries";
import { documentAccess } from "@/server/guard";

export async function GET(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const documentId = new URL(request.url).searchParams.get("documentId") ?? "";
  if (documentId && !(await documentAccess(documentId, user))) return failure("Document introuvable.", 404);
  return reply({ ok: true, messages: await assistantHistory(user.id, documentId || undefined) });
}

export async function POST(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ message: string; documentId?: string; sectionId?: string }>(request);
  const result = await askMisterdil(user, {
    message: typeof body.message === "string" ? body.message : "",
    documentId: typeof body.documentId === "string" ? body.documentId : undefined,
    sectionId: typeof body.sectionId === "string" ? body.sectionId : undefined,
  });
  if (!result.ok) return failure(result.error);
  return reply(result);
}
