import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "misterdil_session";
const EXCHANGE = "mobile-exchange";
const ADMIN = "admin";

function secret() {
  const value = process.env.AUTH_SECRET || "misterdil-dev-secret-change-before-production-2026";
  return new TextEncoder().encode(value);
}

export async function signSession(userId: string, days = 14) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose) return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

// Handed to the app through its deep link after a Microsoft sign-in. It is short-lived,
// is never accepted as a session, and only the holder of the PKCE verifier can redeem it.
export async function signMobileExchange(userId: string, challenge: string) {
  return new SignJWT({ sub: userId, purpose: EXCHANGE, chal: challenge })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret());
}

export async function redeemMobileExchange(code: string, verifier: string) {
  try {
    const { payload } = await jwtVerify(code, secret());
    if (payload.purpose !== EXCHANGE || typeof payload.sub !== "string") return null;
    if (!verifier || payload.chal !== pkceChallenge(verifier)) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

// Without AUTH_SECRET the development fallback would let anyone forge tokens.
export function secretConfigured() {
  return Boolean(process.env.AUTH_SECRET) || process.env.NODE_ENV !== "production";
}

// Admin tokens carry a purpose, so verifyToken never accepts them as a user session.
export async function signAdminSession(email: string, version: string, hours: number) {
  return new SignJWT({ sub: email, purpose: ADMIN, ver: version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(secret());
}

export async function readAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== ADMIN || typeof payload.sub !== "string" || typeof payload.ver !== "string") return null;
    return { email: payload.sub, version: payload.ver };
  } catch {
    return null;
  }
}

export { COOKIE };
