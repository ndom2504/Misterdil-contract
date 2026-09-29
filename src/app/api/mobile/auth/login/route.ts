import { prisma } from "@/server/db";
import { acceptInvitations } from "@/server/invitations";
import { failure, mobileSession, readJson, reply } from "@/server/mobile";
import { verifyPassword } from "@/server/password";

export async function POST(request: Request) {
  const body = await readJson<{ email: string; password: string }>(request);
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return failure("Courriel ou mot de passe incorrect.", 401);
  }
  await acceptInvitations(user.id, user.email);
  return reply({ ok: true, token: await mobileSession(user.id), onboarded: user.onboarded });
}
