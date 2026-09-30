import { startCall } from "@/server/chat";
import { failure, mobileUser, reply } from "@/server/mobile";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const result = await startCall(user, id);
  if (!result.ok) return failure(result.error, 503);
  return reply(result);
}
