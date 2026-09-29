import { sendToMembers } from "@/server/actions/collaboration";
import { failure, mobileUser, reply } from "@/server/mobile";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const result = await sendToMembers(id);
  if (!result.ok) return failure(result.error);
  return reply(result);
}
