"use server";

import { redirect } from "next/navigation";
import { cleanNext, onboardingPath } from "@/lib/next-path";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/current-user";
import { acceptInvitations } from "@/server/invitations";
import { saveOnboarding } from "@/server/onboarding";
import { hashPassword, verifyPassword } from "@/server/password";
import { savePassword, saveProfile } from "@/server/profile";
import { clearSession, createSession } from "@/server/session";

export type FormState = { error?: string };

export async function register(_state: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Indiquez votre nom." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Indiquez un courriel valide." };
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };

  const next = String(formData.get("suivant") ?? "");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Un compte existe déjà avec ce courriel." };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  await acceptInvitations(user.id, email);
  await createSession(user.id);
  redirect(onboardingPath(next));
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
  await acceptInvitations(user.id, user.email);
  await createSession(user.id, remember ? 30 : 1);
  redirect(user.onboarded ? next : onboardingPath(next));
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function completeOnboarding(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const field = (key: string) => String(formData.get(key) ?? "");
  const saved = await saveOnboarding(user, {
    kind: field("kind"),
    name: field("name"),
    organization: field("organization"),
    jobTitle: field("jobTitle"),
    sector: field("sector"),
    address: field("address"),
    phone: field("phone"),
  });
  if (saved.error) return saved;

  const next = field("suivant");
  if (next) redirect(cleanNext(next));
  const memberships = await prisma.workspaceMember.count({ where: { userId: user.id } });
  redirect(memberships ? "/accueil" : "/documents/nouveau");
}

export async function updateProfile(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  return saveProfile(user, {
    name: String(formData.get("name") ?? ""),
    jobTitle: String(formData.get("jobTitle") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    organization: String(formData.get("organization") ?? ""),
  });
}

export async function changePassword(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  return savePassword(user, String(formData.get("current") ?? ""), String(formData.get("next") ?? ""));
}
