import { listConversations } from "@/server/chat";
import { failure, mobileUser, reply } from "@/server/mobile";

export async function GET() {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  return reply({ ok: true, conversations: await listConversations(user) });
}
