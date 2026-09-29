import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { recordActivity } from "@/server/journal";
import { storeFile } from "@/server/storage";

const ALLOWED = new Set(["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "webp"]);
const MAX = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const form = await request.formData();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const documentId = String(form.get("documentId") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Le fichier dépasse 10 Mo." }, { status: 400 });

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED.has(extension)) return NextResponse.json({ error: "Type de fichier non accepté." }, { status: 400 });

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (!membership || membership.role === "READER") {
    return NextResponse.json({ error: "Dépôt non autorisé." }, { status: 403 });
  }

  const mimeType = file.type || "application/octet-stream";
  let stored: string;
  try {
    stored = await storeFile(extension, Buffer.from(await file.arrayBuffer()), mimeType);
  } catch (error) {
    console.error("[pieces-jointes]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Le fichier n'a pas pu être enregistré. Réessayez." }, { status: 500 });
  }

  const attachment = await prisma.attachment.create({
    data: {
      workspaceId,
      documentId: documentId || null,
      name: file.name,
      mimeType,
      size: file.size,
      storagePath: stored,
      uploadedById: user.id,
    },
  });
  await recordActivity({
    workspaceId,
    documentId: documentId || null,
    actorId: user.id,
    actorName: user.name,
    kind: "CREATE",
    message: `${user.name} a ajouté le fichier « ${file.name} ».`,
  });

  return NextResponse.json({ id: attachment.id });
}
