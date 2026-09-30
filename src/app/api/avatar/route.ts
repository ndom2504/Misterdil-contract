import { failure, mobileUser, reply } from "@/server/mobile";
import { removeAvatar, saveAvatar } from "@/server/profile";

export async function POST(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  let file: FormDataEntryValue | null = null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return failure("Image manquante.");
  }
  if (!(file instanceof File)) return failure("Image manquante.");
  const saved = await saveAvatar(user, file);
  if (saved.error) return failure(saved.error);
  return reply({ ok: true, avatarUrl: saved.avatarUrl });
}

export async function DELETE() {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  await removeAvatar(user);
  return reply({ ok: true });
}
