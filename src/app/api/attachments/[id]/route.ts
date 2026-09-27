import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/current-user";
import { prisma } from "@/server/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const file = await prisma.attachment.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: file.workspaceId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  if (!file.storagePath) return NextResponse.json({ error: "Fichier indisponible." }, { status: 404 });

  const buffer = await readFile(path.join(process.cwd(), "data", "uploads", file.storagePath));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.name.replace(/"/g, "")}"`,
    },
  });
}
