import type { NextRequest } from "next/server";
import { searchPeople } from "@/server/actions/people";
import { failure, mobileUser, reply } from "@/server/mobile";

export async function GET(request: NextRequest) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 120);
  return reply({ ok: true, people: await searchPeople(query) });
}
