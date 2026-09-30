import { assist, type AssistantContext } from "@/server/ai";
import type { SessionUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { buildAssistantContext } from "@/server/queries";

const MAX_QUESTION = 2000;

export async function askMisterdil(user: SessionUser, input: { message: string; documentId?: string; sectionId?: string }) {
  const text = input.message.trim().slice(0, MAX_QUESTION);
  if (text.length < 2) return { ok: false as const, error: "Écrivez votre question." };
  const documentId = input.documentId || undefined;
  const context: AssistantContext = await buildAssistantContext(user, documentId);
  if (documentId && !context.document) return { ok: false as const, error: "Ce document ne vous est pas accessible." };

  if (documentId && input.sectionId) {
    const section = await prisma.documentSection.findFirst({
      where: { id: input.sectionId, documentId },
      select: { title: true, content: true },
    });
    if (section) context.focus = { title: section.title, content: section.content.slice(0, 4000) };
  }

  const answer = await assist(text, context);
  await prisma.aiInteraction.createMany({
    data: [
      { userId: user.id, documentId: documentId ?? null, role: "user", content: text },
      { userId: user.id, documentId: documentId ?? null, role: "assistant", content: answer },
    ],
  });
  return { ok: true as const, answer };
}
