import { listMessages, postMessage } from "@/server/chat";
import { failure, mobileUser, readJson, reply } from "@/server/mobile";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const after = new URL(request.url).searchParams.get("after") ?? undefined;
  const result = await listMessages(user, id, after);
  if (!result) return failure("Conversation inaccessible.", 404);
  return reply({ ok: true, ...result });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ body: string }>(request);
  const result = await postMessage(user, id, typeof body.body === "string" ? body.body : "");
  if (!result.ok) return failure(result.error);
  return reply(result);
}
