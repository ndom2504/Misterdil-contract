import { failure, mobileUser, readJson, reply } from "@/server/mobile";
import { removeAvatar, saveAvatar } from "@/server/profile";
import { claimUpload, storeFormFile } from "@/server/uploads";

// JSON { pathname } after a direct upload to Blob, or multipart with the image itself.
export async function POST(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);

  let stored;
  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    const body = await readJson<{ pathname: string }>(request);
    const pathname = typeof body.pathname === "string" ? body.pathname : "";
    stored = await claimUpload(user, { purpose: "avatar", pathname, name: pathname.split("/").pop() ?? "" });
  } else {
    let file: FormDataEntryValue | null = null;
    try {
      file = (await request.formData()).get("file");
    } catch {
      return failure("Image manquante.");
    }
    if (!(file instanceof File)) return failure("Image manquante.");
    stored = await storeFormFile(user, "avatar", file);
  }
  if (!stored.ok) return failure(stored.error);
  const saved = await saveAvatar(user, stored);
  return reply({ ok: true, avatarUrl: saved.avatarUrl });
}

export async function DELETE() {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  await removeAvatar(user);
  return reply({ ok: true });
}
