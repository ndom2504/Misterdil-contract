import { failure, mobileUser, reply } from "@/server/mobile";
import { recordSectionView } from "@/server/social";

export async function POST(_request: Request, context: { params: Promise<{ id: string; sectionId: string }> }) {
  const { id, sectionId } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const result = await recordSectionView(user, id, sectionId);
  if (!result.ok) return failure(result.error, 404);
  return reply(result);
}
