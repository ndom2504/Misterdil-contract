import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { readSessionUserId } from "@/server/session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  jobTitle: string;
  profileType: string;
  onboarded: boolean;
  organization: { id: string; name: string; sector: string; kind: string; address: string; phone: string } | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const userId = await readSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone ?? "",
    jobTitle: user.jobTitle ?? "",
    profileType: user.profileType ?? "",
    onboarded: user.onboarded,
    organization: user.organization
      ? {
          id: user.organization.id,
          name: user.organization.name,
          sector: user.organization.sector ?? "",
          kind: user.organization.kind,
          address: user.organization.address,
          phone: user.organization.phone,
        }
      : null,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}
