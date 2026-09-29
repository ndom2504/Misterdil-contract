import { SECTORS } from "@/lib/catalog";
import { prisma } from "@/server/db";
import { failure, mobileUser, readJson, reply } from "@/server/mobile";
import { saveOnboarding, type OnboardingInput } from "@/server/onboarding";

export async function GET() {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const [unread, microsoft] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, read: false } }),
    prisma.microsoftAccount.findUnique({ where: { userId: user.id }, select: { email: true } }),
  ]);
  return reply({
    ok: true,
    user,
    unread,
    microsoftEmail: microsoft?.email ?? "",
    sectors: SECTORS.map((sector) => ({ id: sector.id, label: sector.label })),
  });
}

export async function PATCH(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const body = await readJson<OnboardingInput>(request);
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const saved = await saveOnboarding(user, {
    kind: text(body.kind),
    name: text(body.name),
    organization: text(body.organization),
    jobTitle: text(body.jobTitle),
    sector: text(body.sector),
    address: text(body.address),
    phone: text(body.phone),
  });
  if (saved.error) return failure(saved.error);
  return reply({ ok: true });
}
