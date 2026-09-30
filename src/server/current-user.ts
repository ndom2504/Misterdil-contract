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
  avatarUrl: string;
  organization: { id: string; name: string; sector: string; kind: string; address: string; phone: string } | null;
};

// Versioned by updatedAt so clients refetch after a new upload.
export function avatarUrl(user: { id: string; avatarPath: string; updatedAt: Date }) {
  return user.avatarPath ? `/api/avatars/${user.id}?v=${user.updatedAt.getTime()}` : "";
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const userId = await readSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });
  if (!user || user.disabledAt) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone ?? "",
    jobTitle: user.jobTitle ?? "",
    profileType: user.profileType ?? "",
    onboarded: user.onboarded,
    avatarUrl: avatarUrl(user),
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

export const DISABLED_MESSAGE = "Ce compte a été désactivé. Contactez le support Misterdil.";

// A valid cookie for a deactivated or deleted account must be cleared first, otherwise the
// proxy sends the visitor back from /connexion to /accueil forever.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect((await readSessionUserId()) ? "/api/session/fin" : "/connexion");
  return user;
}
