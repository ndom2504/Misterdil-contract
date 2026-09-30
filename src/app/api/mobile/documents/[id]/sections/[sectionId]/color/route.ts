import { failure, mobileUser, readJson, reply } from "@/server/mobile";
import { setSectionColor } from "@/server/social";

export async function PUT(request: Request, context: { params: Promise<{ id: string; sectionId: string }> }) {
  const { id, sectionId } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ color: string }>(request);
  const result = await setSectionColor(user, id, sectionId, body.color);
  if (!result.ok) return failure(result.error, 403);
  return reply(result);
}
