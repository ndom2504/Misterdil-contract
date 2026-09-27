import { SignJWT, jwtVerify } from "jose";

const COOKIE = "misterdil_session";

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
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export { COOKIE };
