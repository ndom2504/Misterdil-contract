"use server";

import { redirect } from "next/navigation";
import { PROFILE_TYPES } from "@/lib/domain";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/current-user";
import { acceptInvitations } from "@/server/invitations";
import { hashPassword, verifyPassword } from "@/server/password";
import { clearSession, createSession } from "@/server/session";

export type FormState = { error?: string };

function cleanNext(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/accueil";
}

export async function register(_state: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Indiquez votre nom." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Indiquez un courriel valide." };
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Un compte existe déjà avec ce courriel." };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  await acceptInvitations(user.id, email);
  await createSession(user.id);
  redirect("/onboarding");
}

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = cleanNext(String(formData.get("suivant") ?? "/accueil"));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Courriel ou mot de passe incorrect." };
  }

  const remember = formData.get("remember") === "1";
  await createSession(user.id, remember ? 30 : 1);
  redirect(user.onboarded ? next : "/onboarding");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function completeOnboarding(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const organizationName = String(formData.get("organization") ?? "").trim();
  const profileType = String(formData.get("profileType") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const workspaceName = String(formData.get("workspace") ?? "").trim();
  const sector = String(formData.get("sector") ?? "").trim();

  if (organizationName.length < 2) return { error: "Indiquez le nom de votre organisation." };
  if (!PROFILE_TYPES.includes(profileType as (typeof PROFILE_TYPES)[number])) {
    return { error: "Choisissez un profil." };
  }
  if (workspaceName.length < 2) return { error: "Donnez un nom à votre premier espace." };

  const organization = await prisma.organization.create({
    data: { name: organizationName, sector, ownerId: user.id },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { organizationId: organization.id, profileType, jobTitle, onboarded: true },
  });
  const workspace = await prisma.workspace.create({
    data: {
      organizationId: organization.id,
      name: workspaceName,
      sector,
      createdById: user.id,
      description: "",
    },
  });
  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: "CREATOR" },
  });
  redirect("/documents/nouveau");
}

export async function updateProfile(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const organizationName = String(formData.get("organization") ?? "").trim();
  if (name.length < 2) return { error: "Indiquez votre nom." };

  await prisma.user.update({
    where: { id: user.id },
    data: { name, jobTitle, phone },
  });
  if (user.organization && organizationName.length > 1) {
    await prisma.organization.update({
      where: { id: user.organization.id },
      data: { name: organizationName },
    });
  }
  return {};
}

export async function changePassword(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8) return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record || !(await verifyPassword(current, record.passwordHash))) {
    return { error: "Le mot de passe actuel est incorrect." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });
  return {};
}
