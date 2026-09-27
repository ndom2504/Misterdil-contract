import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";

export function touchDocument(documentId: string) {
  revalidatePath("/accueil");
  revalidatePath("/documents");
  revalidatePath("/espaces");
  revalidatePath("/cahiers");
  revalidatePath("/discussions");
  revalidatePath("/signatures");
  revalidatePath("/activite");
  revalidatePath("/notifications");
  revalidatePath(`/documents/${documentId}`);
}

export async function recordActivity(input: {
  workspaceId?: string | null;
  documentId?: string | null;
  actorId?: string | null;
  actorName: string;
  kind: string;
  message: string;
  createdAt?: Date;
}) {
  await prisma.activity.create({
    data: {
      workspaceId: input.workspaceId ?? null,
      documentId: input.documentId ?? null,
      actorId: input.actorId ?? null,
      actorName: input.actorName,
      kind: input.kind,
      message: input.message,
      createdAt: input.createdAt,
    },
  });
}

export async function notifyUser(input: {
  userId: string;
  kind: string;
  title: string;
  body?: string;
  href?: string;
}) {
  if (!input.userId) return;
  await prisma.notification.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? "",
      href: input.href ?? "",
    },
  });
}

export async function saveVersion(input: {
  documentId: string;
  label: string;
  createdByName: string;
  sections: { anchor: string; title: string; content: string; status: string; position: number }[];
}) {
  await prisma.documentVersion.create({
    data: {
      documentId: input.documentId,
      label: input.label,
      createdByName: input.createdByName,
      snapshot: JSON.stringify(input.sections),
    },
  });
}
