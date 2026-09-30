import { DISABLED_MESSAGE } from "@/server/current-user";
import { prisma } from "@/server/db";
import { failure, mobileSession, readJson, reply } from "@/server/mobile";
import { redeemMobileExchange } from "@/server/token";

export async function POST(request: Request) {
  const body = await readJson<{ code: string; verifier: string }>(request);
  const userId = await redeemMobileExchange(String(body.code ?? ""), String(body.verifier ?? ""));
  if (!userId) return failure("La connexion Microsoft a expiré. Réessayez.", 401);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, onboarded: true, disabledAt: true } });
  if (!user) return failure("Compte introuvable.", 401);
  if (user.disabledAt) return failure(DISABLED_MESSAGE, 403);
  return reply({ ok: true, token: await mobileSession(user.id), onboarded: user.onboarded });
}
