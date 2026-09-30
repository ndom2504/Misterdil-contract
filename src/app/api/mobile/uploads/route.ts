import { failure, mobileUser, readJson, reply } from "@/server/mobile";
import { isUploadPurpose, prepareUpload } from "@/server/uploads";

export async function POST(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ purpose: string; name: string; size: number; documentId: string }>(request);
  if (!isUploadPurpose(body.purpose)) return failure("Type d'envoi inconnu.");
  const result = await prepareUpload(user, {
    purpose: body.purpose,
    name: typeof body.name === "string" ? body.name : "",
    size: typeof body.size === "number" && body.size > 0 ? body.size : 0,
    documentId: typeof body.documentId === "string" ? body.documentId : "",
  });
  if (!result.ok) return failure(result.error);
  return reply(result);
}
