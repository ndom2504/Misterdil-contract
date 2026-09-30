import { deleteAgendaEvent } from "@/server/agenda";
import { failure, mobileUser, reply } from "@/server/mobile";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; eventId: string }> }) {
  const { id, eventId } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const result = await deleteAgendaEvent(user, id, eventId);
  if (!result.ok) return failure(result.error, 403);
  return reply(result);
}
