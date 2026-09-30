import type { SessionUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/password";
import { storeFile } from "@/server/storage";

export type ProfileInput = { name: string; jobTitle: string; phone: string; organization: string };

export async function saveProfile(user: SessionUser, input: ProfileInput): Promise<{ error?: string }> {
  const name = input.name.trim().slice(0, 120);
  const jobTitle = input.jobTitle.trim().slice(0, 120);
  const phone = input.phone.trim().slice(0, 40);
  const organizationName = input.organization.trim().slice(0, 160);
  if (name.length < 2) return { error: "Indiquez votre nom." };

  await prisma.user.update({ where: { id: user.id }, data: { name, jobTitle, phone } });
  if (user.organization && organizationName.length > 1) {
    await prisma.organization.update({ where: { id: user.organization.id }, data: { name: organizationName } });
  }
  return {};
}

export async function savePassword(user: SessionUser, current: string, next: string): Promise<{ error?: string }> {
  if (next.length < 8) return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record || !(await verifyPassword(current, record.passwordHash))) {
    return { error: "Le mot de passe actuel est incorrect." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return {};
}

const AVATAR_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AVATAR_MAX = 5 * 1024 * 1024;

export async function saveAvatar(user: SessionUser, file: File): Promise<{ error?: string; avatarUrl?: string }> {
  const extension = AVATAR_TYPES[file.type];
  if (!extension) return { error: "Choisissez une image JPG, PNG ou WebP." };
  if (file.size > AVATAR_MAX) return { error: "L'image dépasse 5 Mo." };
  let stored: string;
  try {
    stored = await storeFile(extension, Buffer.from(await file.arrayBuffer()), file.type, "avatars");
  } catch (error) {
    console.error("[photo-profil]", error instanceof Error ? error.message : error);
    return { error: "La photo n'a pas pu être enregistrée. Réessayez." };
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { avatarPath: stored },
    select: { id: true, avatarPath: true, updatedAt: true },
  });
  return { avatarUrl: `/api/avatars/${updated.id}?v=${updated.updatedAt.getTime()}` };
}

export async function removeAvatar(user: SessionUser) {
  await prisma.user.update({ where: { id: user.id }, data: { avatarPath: "" } });
}
