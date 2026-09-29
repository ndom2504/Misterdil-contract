import { prisma } from "@/server/db";
import { acceptInvitations } from "@/server/invitations";
import { failure, mobileSession, readJson, reply } from "@/server/mobile";
import { hashPassword } from "@/server/password";

export async function POST(request: Request) {
  const body = await readJson<{ name: string; email: string; password: string }>(request);
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (name.length < 2) return failure("Indiquez votre nom.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return failure("Indiquez un courriel valide.");
  if (password.length < 8) return failure("Le mot de passe doit contenir au moins 8 caractères.");
  if (await prisma.user.findUnique({ where: { email } })) return failure("Un compte existe déjà avec ce courriel.", 409);

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  await acceptInvitations(user.id, email);
  return reply({ ok: true, token: await mobileSession(user.id), onboarded: false });
}
