import { NextResponse } from "next/server";
import { cleanNext } from "@/lib/next-path";
import { createMicrosoftProof, microsoftAuthorizeUrl } from "@/server/microsoft";
import { readSessionUserId } from "@/server/session";

export async function GET(request: Request) {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    const page = (await readSessionUserId()) ? "/accueil" : "/connexion";
    return NextResponse.redirect(new URL(`${page}?microsoft=configuration`, request.url));
  }
  const proof = createMicrosoftProof();
  const url = new URL(request.url);
  const next = cleanNext(url.searchParams.get("suivant") ?? "", "");
  const response = NextResponse.redirect(microsoftAuthorizeUrl(url.origin, proof.state, proof.verifier));
  response.cookies.set("misterdil_ms_proof", JSON.stringify({ ...proof, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
