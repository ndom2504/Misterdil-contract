import { prisma } from "@/server/db";
import { failure, mobileUser, readJson, reply } from "@/server/mobile";

const EXPO_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/;

export async function POST(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ token: string; platform: string }>(request);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!EXPO_TOKEN.test(token)) return failure("Jeton de notification invalide.");
  const platform = body.platform === "ios" || body.platform === "android" ? body.platform : "";
  // A device belongs to whoever signed in last on it.
  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: user.id, platform },
    create: { token, userId: user.id, platform },
  });
  return reply({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ token: string }>(request);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (token) await prisma.pushToken.deleteMany({ where: { token, userId: user.id } });
  return reply({ ok: true });
}
