"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/current-user";
import { mailAction } from "@/server/microsoft";

export async function outlookAction(messageId: string, action: "read" | "archive" | "reply", comment?: string) {
  const user = await requireUser();
  const result = await mailAction(user.id, messageId, action, comment);
  if (result.ok) {
    revalidatePath("/accueil");
    revalidatePath("/notifications");
  }
  return result;
}
