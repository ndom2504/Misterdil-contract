"use server";

import { revalidatePath } from "next/cache";
import { analyzeDescription, suggestDomains } from "@/server/ai";
import { askMisterdil } from "@/server/assistant";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/current-user";

export async function askAssistant(message: string, documentId?: string, sectionId?: string) {
  const user = await requireUser();
  const result = await askMisterdil(user, { message, documentId, sectionId });
  if (!result.ok) return result;
  revalidatePath("/assistant");
  if (documentId) revalidatePath(`/documents/${documentId}`);
  return result;
}

export async function analyzeProject(documentId: string, description: string) {
  const user = await requireUser();
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { stakeholders: true },
  });
  if (!document) return { ok: false as const, error: "Document introuvable." };
  const { sectorById } = await import("@/lib/catalog");
  const understanding = await analyzeDescription({
    description,
    sectorLabel: sectorById(document.sector)?.label ?? document.sector,
    domain: document.domain,
    organizationName: user.organization?.name ?? "",
    parties: document.stakeholders.map((party) => ({
      organization: party.organization,
      name: party.name,
      partyType: party.partyType,
    })),
  });
  await prisma.document.update({
    where: { id: documentId },
    data: { description: description.trim(), briefJson: JSON.stringify(understanding), briefConfirmed: false },
  });
  return { ok: true as const, understanding };
}

export async function moreDomains(sectorId: string, current: string[]) {
  await requireUser();
  try {
    const domains = await suggestDomains(sectorId, current.slice(0, 40));
    return { ok: true as const, domains };
  } catch {
    return { ok: false as const, domains: [] as string[] };
  }
}

export async function markNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/notifications");
  revalidatePath("/accueil");
}
