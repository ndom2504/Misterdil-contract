import { after } from "next/server";
import { avatarUrl, type SessionUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/password";
import { removeFile } from "@/server/storage";
import type { StoredUpload } from "@/server/uploads";

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

export async function saveAvatar(user: SessionUser, stored: StoredUpload): Promise<{ avatarUrl: string }> {
  const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarPath: true } });
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { avatarPath: stored.storagePath },
    select: { id: true, avatarPath: true, updatedAt: true },
  });
  if (previous?.avatarPath && previous.avatarPath !== stored.storagePath) after(() => removeFile(previous.avatarPath));
  return { avatarUrl: avatarUrl(updated) };
}

export async function removeAvatar(user: SessionUser) {
  const previous = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarPath: true } });
  await prisma.user.update({ where: { id: user.id }, data: { avatarPath: "" } });
  if (previous?.avatarPath) after(() => removeFile(previous.avatarPath));
}
