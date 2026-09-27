import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE, verifyToken } from "@/server/token";

const PROTECTED = [
  "/accueil",
  "/espaces",
  "/documents",
  "/cahiers",
  "/discussions",
  "/signatures",
  "/collaborateurs",
  "/activite",
  "/assistant",
  "/parametres",
  "/notifications",
  "/recherche",
  "/onboarding",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const token = request.cookies.get(COOKIE)?.value;
  const userId = token ? await verifyToken(token) : null;

  if (needsAuth && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("suivant", pathname);
    return NextResponse.redirect(url);
  }

  if (userId && (pathname === "/connexion" || pathname === "/inscription")) {
    const url = request.nextUrl.clone();
    url.pathname = "/accueil";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
