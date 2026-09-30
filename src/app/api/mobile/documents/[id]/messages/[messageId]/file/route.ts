import { NextResponse } from "next/server";
import { messageFile } from "@/server/chat";
import { failure, mobileUser } from "@/server/mobile";
import { openFile } from "@/server/storage";

const INLINE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// ?inline=1 lets images be shown in the conversation; everything else is always a download.
export async function GET(request: Request, context: { params: Promise<{ id: string; messageId: string }> }) {
  const { id, messageId } = await context.params;
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const file = await messageFile(user, id, messageId);
  if (!file) return failure("Fichier introuvable.", 404);
  const body = await openFile(file.path);
  if (!body) return failure("Fichier indisponible.", 404);

  const inline = INLINE.has(file.type) && new URL(request.url).searchParams.get("inline") === "1";
  return new NextResponse(body, {
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
