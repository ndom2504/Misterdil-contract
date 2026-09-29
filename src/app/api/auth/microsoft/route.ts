import { NextResponse } from "next/server";
import { createMicrosoftProof, microsoftAuthorizeUrl } from "@/server/microsoft";

export async function GET(request: Request) {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/accueil?microsoft=configuration", request.url));
  }
  const proof = createMicrosoftProof();
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(microsoftAuthorizeUrl(origin, proof.state, proof.verifier));
  response.cookies.set("misterdil_ms_proof", JSON.stringify(proof), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
