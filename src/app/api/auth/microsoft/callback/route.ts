import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { exchangeMicrosoftCode, saveMicrosoftAccount } from "@/server/microsoft";
import { readSessionUserId } from "@/server/session";
import { COOKIE, signSession } from "@/server/token";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const proofCookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("misterdil_ms_proof="))?.slice("misterdil_ms_proof=".length);
  const home = new URL("/accueil", url.origin);

  const finish = (message: string, sessionUserId?: string) => {
    if (message) home.searchParams.set("microsoft", message);
    const response = NextResponse.redirect(home);
    response.cookies.set("misterdil_ms_proof", "", { path: "/", maxAge: 0 });
    return { response, sessionUserId };
  };

  if (!code || !state || !proofCookie) return finish("connexion-interrompue").response;
  let proof: { state?: string; verifier?: string };
  try {
    proof = JSON.parse(decodeURIComponent(proofCookie)) as { state?: string; verifier?: string };
  } catch {
    return finish("connexion-interrompue").response;
  }
  if (proof.state !== state || !proof.verifier) return finish("connexion-interrompue").response;

  try {
    const token = await exchangeMicrosoftCode(url.origin, code, proof.verifier);
    let userId = await readSessionUserId();
    if (!userId) {
      const profileEmail = (await microsoftEmail(token.access_token ?? "")).toLowerCase();
      const user = profileEmail
        ? await prisma.user.findFirst({ where: { OR: [{ email: profileEmail }, { email: profileEmail.toLowerCase() }] } })
        : null;
      if (!user) return finish("compte-inconnu").response;
      userId = user.id;
    }
    await saveMicrosoftAccount(userId, token);
    const response = finish("ok").response;
    if (!(await readSessionUserId())) {
      const session = await signSession(userId, 14);
      response.cookies.set(COOKIE, session, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
      });
    }
    return response;
  } catch {
    return finish("connexion-refusee").response;
  }
}

async function microsoftEmail(token: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return "";
  const profile = (await response.json()) as { mail?: string; userPrincipalName?: string };
  return profile.mail || profile.userPrincipalName || "";
}
