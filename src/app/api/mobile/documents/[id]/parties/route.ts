import { saveParties } from "@/server/actions/collaboration";
import { failure, mobileUser, partiesFrom, readJson, reply } from "@/server/mobile";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ parties: unknown; moderatorId: string }>(request);
  const result = await saveParties(id, partiesFrom(body.parties), typeof body.moderatorId === "string" ? body.moderatorId : user.id);
  if (!result.ok) return failure(result.error);
  return reply(result);
}
