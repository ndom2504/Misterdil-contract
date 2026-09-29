import { addComment } from "@/server/actions/collaboration";
import { failure, mobileUser, readJson, reply } from "@/server/mobile";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ sectionId: string; discussionId: string; body: string }>(request);
  const result = await addComment(id, {
    sectionId: typeof body.sectionId === "string" ? body.sectionId : undefined,
    discussionId: typeof body.discussionId === "string" && body.discussionId ? body.discussionId : undefined,
    body: typeof body.body === "string" ? body.body.slice(0, 5000) : "",
  });
  if (!result.ok) return failure(result.error);
  return reply(result);
}
