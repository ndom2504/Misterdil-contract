import { deleteWorkspace } from "@/server/deletion";
import { failure, mobileUser, reply } from "@/server/mobile";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const result = await deleteWorkspace(user, id);
  if (!result.ok) return failure(result.error, 403);
  return reply(result);
}
