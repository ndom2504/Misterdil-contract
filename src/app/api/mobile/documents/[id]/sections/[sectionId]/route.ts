import { updateSectionContent } from "@/server/actions/documents";
import { failure, mobileUser, readJson, reply } from "@/server/mobile";

export async function PUT(request: Request, context: { params: Promise<{ id: string; sectionId: string }> }) {
  const { id, sectionId } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ content: string; log: boolean; expectedUpdatedAt: string }>(request);
  if (typeof body.content !== "string") return failure("Texte manquant.");
  const result = await updateSectionContent(
    id,
    sectionId,
    body.content.slice(0, 100_000),
    body.log === true,
    typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : undefined,
  );
  if (!result.ok) return reply(result, "conflict" in result ? 409 : 400);
  return reply(result);
}
