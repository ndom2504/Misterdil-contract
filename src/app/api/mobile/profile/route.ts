import { failure, mobileUser, readJson, reply } from "@/server/mobile";
import { saveProfile, type ProfileInput } from "@/server/profile";

export async function PUT(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<ProfileInput>(request);
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const saved = await saveProfile(user, {
    name: text(body.name),
    jobTitle: text(body.jobTitle),
    phone: text(body.phone),
    organization: text(body.organization),
  });
  if (saved.error) return failure(saved.error);
  return reply({ ok: true });
}
