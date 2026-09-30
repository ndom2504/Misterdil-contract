import { failure, mobileUser, readJson, reply } from "@/server/mobile";
import { setDocumentColor } from "@/server/social";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ color: string }>(request);
  const result = await setDocumentColor(user, id, body.color);
  if (!result.ok) return failure(result.error, 403);
  return reply(result);
}
