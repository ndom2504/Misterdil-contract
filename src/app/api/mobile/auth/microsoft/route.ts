import { NextResponse } from "next/server";
import { allowedAppRedirect } from "@/server/mobile";
import { createMicrosoftProof, microsoftAuthorizeUrl } from "@/server/microsoft";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const app = allowedAppRedirect(url.searchParams.get("redirect") ?? "");
  const challenge = url.searchParams.get("challenge") ?? "";
  if (!app || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
    return NextResponse.json({ ok: false, error: "Demande de connexion invalide." }, { status: 400 });
  }
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    const back = new URL(app);
    back.searchParams.set("error", "configuration");
    return NextResponse.redirect(back.toString());
  }
  const proof = createMicrosoftProof();
  const response = NextResponse.redirect(microsoftAuthorizeUrl(url.origin, proof.state, proof.verifier));
  response.cookies.set("misterdil_ms_proof", JSON.stringify({ ...proof, next: "", app, challenge }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
