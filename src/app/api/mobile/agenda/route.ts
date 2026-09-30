import { addDays, validDay, zoneDay } from "@/lib/agenda";
import { userAgenda } from "@/server/agenda";
import { failure, mobileUser, reply } from "@/server/mobile";

const MAX_DAYS = 120;

export async function GET(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const params = new URL(request.url).searchParams;
  const today = zoneDay(new Date());
  const from = validDay(params.get("from") ?? "") ? (params.get("from") as string) : today;
  let to = validDay(params.get("to") ?? "") ? (params.get("to") as string) : addDays(from, 60);
  if (to < from) to = from;
  if (to > addDays(from, MAX_DAYS)) to = addDays(from, MAX_DAYS);
  const agenda = await userAgenda(user, from, to);
  return reply({ ok: true, from, to, today, ...agenda });
}
