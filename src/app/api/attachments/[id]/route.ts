import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { openFile } from "@/server/storage";

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

  const body = await openFile(file.storagePath);
  if (!body) return NextResponse.json({ error: "Fichier indisponible." }, { status: 404 });
  return new NextResponse(body, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
