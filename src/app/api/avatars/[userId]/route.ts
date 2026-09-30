import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { openFile } from "@/server/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarPath: true } });
  if (!user?.avatarPath) return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  const body = await openFile(user.avatarPath);
  if (!body) return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });

  const extension = user.avatarPath.split(".").pop()?.toLowerCase() ?? "";
  return new NextResponse(body, {
    headers: {
      "Content-Type": TYPES[extension] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      // URLs carry a version, so a new photo always gets a new URL.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
