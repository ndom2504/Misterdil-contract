import { clearHistory } from "@/server/chat";
import { failure, mobileUser, readJson, reply } from "@/server/mobile";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ scope: string }>(request);
  const result = await clearHistory(user, id, body.scope === "all" ? "all" : "me");
  if (!result.ok) return failure(result.error, 403);
  return reply(result);
}
