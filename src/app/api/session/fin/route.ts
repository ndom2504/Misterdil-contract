import { NextResponse } from "next/server";
import { COOKIE } from "@/server/token";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/connexion?compte=ferme", request.url));
  response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
