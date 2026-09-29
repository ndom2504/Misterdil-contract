import type { SessionUser } from "@/server/current-user";
import { prisma } from "@/server/db";

export type OnboardingInput = {
  kind: string;
  name: string;
  organization: string;
  jobTitle: string;
  sector: string;
  address: string;
  phone: string;
};

export async function saveOnboarding(user: SessionUser, input: OnboardingInput): Promise<{ error?: string }> {
  const kind = input.kind === "INDIVIDUAL" ? "INDIVIDUAL" : "ORGANIZATION";
  const name = input.name.trim();
  const organizationName = input.organization.trim();
  const jobTitle = input.jobTitle.trim();
  const sector = input.sector.trim();
  const address = input.address.trim();
  const phone = input.phone.trim();

  if (name.length < 2) return { error: "Indiquez votre nom complet." };
  if (kind === "ORGANIZATION" && organizationName.length < 2) {
    return { error: "Indiquez le nom de votre organisation." };
  }

  const profile = {
    name: kind === "INDIVIDUAL" ? name : organizationName,
    kind,
    sector: kind === "INDIVIDUAL" ? "" : sector,
    address,
    phone,
  };
  await prisma.$transaction(async (tx) => {
    const organization = user.organization
      ? await tx.organization.update({ where: { id: user.organization.id }, data: profile })
      : await tx.organization.create({ data: { ...profile, ownerId: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: {
        name,
        phone,
        jobTitle: kind === "INDIVIDUAL" ? "" : jobTitle,
        profileType: kind === "INDIVIDUAL" ? "Personne physique" : "Organisation",
        organizationId: organization.id,
        onboarded: true,
      },
    });
  });
  return {};
}
