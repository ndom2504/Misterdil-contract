import { cookies, headers } from "next/headers";
import { COOKIE, signSession, verifyToken } from "@/server/token";

export async function createSession(userId: string, days = 14) {
  const token = await signSession(userId, days);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * days,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// The mobile app sends the same signed token as a Bearer header instead of a cookie.
// Browsers never attach it on their own, so it adds no cross-site request risk.
export async function readSessionUserId() {
  const authorization = (await headers()).get("authorization") ?? "";
  if (authorization.startsWith("Bearer ")) return verifyToken(authorization.slice(7).trim());
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
