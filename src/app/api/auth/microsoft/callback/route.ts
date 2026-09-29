import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cleanNext, onboardingPath } from "@/lib/next-path";
import { prisma } from "@/server/db";
import { acceptInvitations } from "@/server/invitations";
import { exchangeMicrosoftCode, saveMicrosoftAccount } from "@/server/microsoft";
import { allowedAppRedirect } from "@/server/mobile";
import { hashPassword } from "@/server/password";
import { readSessionUserId } from "@/server/session";
import { COOKIE, signMobileExchange, signSession } from "@/server/token";

const ADMIN_CONSENT = /AADSTS(65001|90094|90095|900941)\b/;

type Proof = { state?: string; verifier?: string; next?: string; app?: string; challenge?: string };

function readProof(request: Request): Proof | null {
  const raw = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("misterdil_ms_proof="))?.slice("misterdil_ms_proof=".length);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as Proof;
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const proof = readProof(request);
  // A sign-in started from the mobile app returns to the app, whatever web session this browser holds.
  const app = allowedAppRedirect(proof?.app ?? "");
  const sessionUserId = app ? null : await readSessionUserId();

  const clearProof = (response: NextResponse) => {
    response.cookies.set("misterdil_ms_proof", "", { path: "/", maxAge: 0 });
    return response;
  };
  const toApp = (params: Record<string, string>) => {
    const target = new URL(app);
    for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
    return clearProof(NextResponse.redirect(target.toString()));
  };
  const redirectTo = (path: string) => clearProof(NextResponse.redirect(new URL(path, url.origin)));
  const fail = (reason: string, detail?: string) => {
    if (detail) console.error(`[microsoft] ${reason}: ${detail}`);
    if (app) return toApp({ error: reason });
    return redirectTo(`${sessionUserId ? "/accueil" : "/connexion"}?microsoft=${reason}`);
  };

  const providerError = url.searchParams.get("error");
  if (providerError) {
    const description = url.searchParams.get("error_description") ?? "";
    if (ADMIN_CONSENT.test(description)) return fail("consentement-admin", description);
    if (providerError === "access_denied") return fail("connexion-annulee", description);
    return fail("connexion-refusee", `${providerError} ${description}`);
  }
  if (!code || !state) return fail("connexion-interrompue", "code ou state absent");
  if (!proof) return fail("connexion-interrompue", "témoin de preuve absent (délai de 10 minutes dépassé ou autre domaine)");
  if (proof.state !== state || !proof.verifier) return fail("connexion-interrompue", "state différent ou témoin illisible");

  let token: Awaited<ReturnType<typeof exchangeMicrosoftCode>>;
  try {
    token = await exchangeMicrosoftCode(url.origin, code, proof.verifier);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(ADMIN_CONSENT.test(message) ? "consentement-admin" : "connexion-refusee", message);
  }

  try {
    let userId = sessionUserId;
    let onboarded = true;
    if (!userId) {
      const profile = await microsoftProfile(token.access_token ?? "");
      if (!profile.email) return fail("compte-inconnu", "profil Microsoft sans courriel");
      const user =
        (await prisma.user.findUnique({ where: { email: profile.email } })) ??
        (await prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name || profile.email.split("@")[0],
            passwordHash: await hashPassword(randomBytes(32).toString("hex")),
          },
        }));
      await acceptInvitations(user.id, profile.email);
      userId = user.id;
      onboarded = user.onboarded;
    }

    await saveMicrosoftAccount(userId, token);
    if (app) return toApp({ code: await signMobileExchange(userId, proof.challenge ?? "") });

    const next = cleanNext(proof.next ?? "", "");
    const response = redirectTo(onboarded ? next || "/accueil?microsoft=ok" : onboardingPath(next));
    if (!sessionUserId) {
      response.cookies.set(COOKIE, await signSession(userId, 14), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
      });
    }
    return response;
  } catch (error) {
    return fail("connexion-refusee", error instanceof Error ? error.message : String(error));
  }
}

async function microsoftProfile(token: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { name: "", email: "" };
  const profile = (await response.json()) as { displayName?: string; mail?: string; userPrincipalName?: string };
  const email = (profile.mail || profile.userPrincipalName || "").trim().toLowerCase();
  return { name: profile.displayName?.trim() ?? "", email: email.includes("@") && !email.includes("#ext#") ? email : "" };
}
