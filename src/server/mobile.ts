import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "@/server/current-user";
import type { PartyInput } from "@/server/sharing";
import { signSession } from "@/server/token";

export const MOBILE_SESSION_DAYS = 60;

export function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function failure(error: string, status = 400) {
  return reply({ ok: false, error }, status);
}

export async function mobileUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

export async function mobileSession(userId: string) {
  return signSession(userId, MOBILE_SESSION_DAYS);
}

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" ? (body as Partial<T>) : {};
  } catch {
    return {};
  }
}

export function partiesFrom(value: unknown): PartyInput[] {
  if (!Array.isArray(value)) return [];
  const text = (input: unknown) => (typeof input === "string" ? input.slice(0, 300) : "");
  return value.slice(0, 30).map((item) => {
    const party = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    return {
      name: text(party.name),
      organization: text(party.organization),
      partyType: text(party.partyType),
      email: text(party.email),
      phone: text(party.phone),
      representative: text(party.representative),
      jobTitle: text(party.jobTitle),
      address: text(party.address),
      accessRole: ["MODERATOR", "PARTICIPANT", "READER"].includes(text(party.accessRole)) ? text(party.accessRole) : "PARTICIPANT",
    };
  });
}

// Only the app's own scheme may receive a sign-in result. Expo Go's exp:// links are
// accepted in development, never in production where any exp:// host could claim them.
export function allowedAppRedirect(value: string) {
  if (!value || value.length > 300) return "";
  if (value.startsWith("misterdil://")) return value;
  if (process.env.NODE_ENV !== "production" && value.startsWith("exp://")) return value;
  return "";
}
