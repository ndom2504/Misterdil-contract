import { listMessages, postMessage } from "@/server/chat";
import { failure, mobileUser, readJson, reply } from "@/server/mobile";
import { claimUpload, storeFormFile, type StoredUpload } from "@/server/uploads";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const after = new URL(request.url).searchParams.get("after") ?? undefined;
  const result = await listMessages(user, id, after);
  if (!result) return failure("Conversation inaccessible.", 404);
  return reply({ ok: true, ...result });
}

// JSON { body, upload?: { pathname, name } } after a direct upload to Blob, or multipart
// { body, file } when the file travels in the request (local development without Blob).
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);

  let text = "";
  let file: StoredUpload | undefined;
  if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return failure("Fichier manquant.");
    }
    text = String(form.get("body") ?? "");
    const entry = form.get("file");
    if (entry instanceof File) {
      const stored = await storeFormFile(user, "chat", entry, id);
      if (!stored.ok) return failure(stored.error);
      file = stored;
    }
  } else {
    const body = await readJson<{ body: string; upload: { pathname?: unknown; name?: unknown } }>(request);
    text = typeof body.body === "string" ? body.body : "";
    if (body.upload && typeof body.upload === "object") {
      const claimed = await claimUpload(user, {
        purpose: "chat",
        documentId: id,
        pathname: typeof body.upload.pathname === "string" ? body.upload.pathname : "",
        name: typeof body.upload.name === "string" ? body.upload.name : "",
      });
      if (!claimed.ok) return failure(claimed.error);
      file = claimed;
    }
  }

  const result = await postMessage(user, id, text, file);
  if (!result.ok) return failure(result.error);
  return reply(result);
}
