import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { recordActivity } from "@/server/journal";

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

  const directory = path.join(process.cwd(), "data", "uploads");
  await mkdir(directory, { recursive: true });
  const stored = `${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, stored), bytes);

  const attachment = await prisma.attachment.create({
    data: {
      workspaceId,
      documentId: documentId || null,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
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
