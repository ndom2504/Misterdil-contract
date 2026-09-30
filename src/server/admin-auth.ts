import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { readAdminToken, secretConfigured, signAdminSession } from "@/server/token";

const COOKIE = "misterdil_admin";
const SESSION_HOURS = 8;
const WINDOW_MINUTES = 15;
const MAX_PER_CLIENT = 5;
const MAX_OVERALL = 50;

function credentials() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  return email && password ? { email, password } : null;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function matches(value: string, expected: string) {
  return timingSafeEqual(digest(value), digest(expected));
}

// Changing ADMIN_EMAIL or ADMIN_PASSWORD signs every open console session out.
function fingerprint(email: string, password: string) {
  return createHash("sha256").update(`${email}\n${password}`).digest("base64url").slice(0, 22);
}

async function clientKey() {
  const list = await headers();
  const ip = list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "local";
  return `ip:${ip}`;
}

export function adminReady() {
  if (!credentials()) return "La console n'est pas configurée : ajoutez ADMIN_EMAIL et ADMIN_PASSWORD aux variables d'environnement.";
  if (!secretConfigured()) return "AUTH_SECRET manque sur le serveur : la console reste fermée.";
  return "";
}

export async function currentAdmin() {
  const expected = credentials();
  if (!expected || !secretConfigured()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await readAdminToken(token);
  if (!session || session.email !== expected.email || session.version !== fingerprint(expected.email, expected.password)) return null;
  return { email: expected.email };
}

export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");
  return admin;
}

export async function adminSignIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = adminReady();
  const expected = credentials();
  if (problem || !expected) return { ok: false, error: problem };

  const key = await clientKey();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const [mine, overall] = await Promise.all([
    prisma.adminAttempt.count({ where: { key, createdAt: { gte: since } } }),
    prisma.adminAttempt.count({ where: { createdAt: { gte: since } } }),
  ]);
  const locked = `Trop d'essais. Réessayez dans ${WINDOW_MINUTES} minutes.`;
  if (mine >= MAX_PER_CLIENT || overall >= MAX_OVERALL) return { ok: false, error: locked };

  // Both comparisons always run so the response time says nothing about which one failed.
  const emailOk = matches(email.trim().toLowerCase(), expected.email);
  const passwordOk = matches(password, expected.password);
  if (!emailOk || !passwordOk) {
    await prisma.adminAttempt.create({ data: { key } });
    await prisma.adminAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    console.warn(`[admin] connexion refusée (${key})`);
    return { ok: false, error: mine + 1 >= MAX_PER_CLIENT ? locked : "Identifiants incorrects." };
  }

  await prisma.adminAttempt.deleteMany({ where: { key } });
  const jar = await cookies();
  jar.set(COOKIE, await signAdminSession(expected.email, fingerprint(expected.email, expected.password), SESSION_HOURS), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: SESSION_HOURS * 60 * 60,
  });
  return { ok: true };
}

export async function adminSignOut() {
  const jar = await cookies();
  jar.set(COOKIE, "", { path: "/admin", maxAge: 0 });
}
