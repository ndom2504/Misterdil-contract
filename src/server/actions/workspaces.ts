"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/current-user";
import { recordActivity } from "@/server/journal";

export async function createWorkspace(input: { name: string; description?: string; sector?: string; domain?: string }) {
  const user = await requireUser();
  if (!user.organization) {
    return { ok: false as const, error: "Créez d'abord votre organisation." };
  }
  const name = input.name.trim();
  if (name.length < 2) return { ok: false as const, error: "Donnez un nom à l'espace." };

  const workspace = await prisma.workspace.create({
    data: {
      organizationId: user.organization.id,
      name,
      description: input.description?.trim() ?? "",
      sector: input.sector ?? "",
      domain: input.domain ?? "",
      createdById: user.id,
      members: { create: { userId: user.id, role: "CREATOR" } },
    },
  });
  await recordActivity({
    workspaceId: workspace.id,
    actorId: user.id,
    actorName: user.name,
    kind: "CREATE",
    message: `${user.name} a créé l'espace « ${workspace.name} ».`,
  });
  revalidatePath("/espaces");
  revalidatePath("/accueil");
  return { ok: true as const, id: workspace.id };
}
