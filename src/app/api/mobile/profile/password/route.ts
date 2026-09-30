import { failure, mobileUser, readJson, reply } from "@/server/mobile";
import { savePassword } from "@/server/profile";

export async function POST(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<{ current: string; next: string }>(request);
  const saved = await savePassword(
    user,
    typeof body.current === "string" ? body.current : "",
    typeof body.next === "string" ? body.next : "",
  );
  if (saved.error) return failure(saved.error);
  return reply({ ok: true });
}
