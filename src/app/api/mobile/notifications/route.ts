import { prisma } from "@/server/db";
import { failure, mobileUser, reply } from "@/server/mobile";

export async function GET(request: Request) {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  const sinceRaw = new URL(request.url).searchParams.get("since") ?? "";
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw) : null;
  const items = await prisma.notification.findMany({
    where: { userId: user.id, ...(since ? { createdAt: { gt: since } } : {}) },
    orderBy: { createdAt: "desc" },
    take: since ? 10 : 50,
  });
  return reply({
    ok: true,
    notifications: items.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      body: item.body,
      href: item.href,
      read: item.read,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

export async function POST() {
  const user = await mobileUser();
  if (!user) return failure("Non autorisé.", 401);
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  return reply({ ok: true });
}
