import { toggleReaction } from "@/server/chat";
import { failure, mobileUser, readJson, reply } from "@/server/mobile";

export async function POST(request: Request, context: { params: Promise<{ id: string; messageId: string }> }) {
  const { id, messageId } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ emoji: string }>(request);
  const result = await toggleReaction(user, id, messageId, typeof body.emoji === "string" ? body.emoji : "");
  if (!result.ok) return failure(result.error);
  return reply(result);
}
