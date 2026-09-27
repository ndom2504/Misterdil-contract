"use server";

import { revalidatePath } from "next/cache";
import { assist, analyzeDescription, suggestDomains } from "@/server/ai";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/current-user";
import { buildAssistantContext } from "@/server/queries";

export async function askAssistant(message: string, documentId?: string) {
  const user = await requireUser();
  const text = message.trim();
  if (text.length < 2) return { ok: false as const, error: "Écrivez votre question." };
  const context = await buildAssistantContext(user, documentId || undefined);
  if (documentId && !context.document) return { ok: false as const, error: "Ce document ne vous est pas accessible." };
  const answer = await assist(text, context);
  await prisma.aiInteraction.createMany({
    data: [
      { userId: user.id, documentId: documentId || null, role: "user", content: text },
      { userId: user.id, documentId: documentId || null, role: "assistant", content: answer },
    ],
  });
  revalidatePath("/assistant");
  if (documentId) revalidatePath(`/documents/${documentId}`);
  return { ok: true as const, answer };
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
  const domains = await suggestDomains(sectorId, current);
  return { ok: true as const, domains };
}

export async function markNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/notifications");
  revalidatePath("/accueil");
}
