import { prisma } from "@/server/db";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type ExpoTicket = { status: "ok" | "error"; details?: { error?: string } };

// Best effort: a notification is already stored in the database, so a push failure
// must never break the action that triggered it.
export async function sendPush(userId: string, message: { title: string; body: string; href: string }) {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
    if (!tokens.length) return;
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(
        tokens.map((item) => ({
          to: item.token,
          title: message.title,
          body: message.body,
          sound: "default",
          data: { href: message.href },
        })),
      ),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return;
    const result = (await response.json()) as { data?: ExpoTicket[] };
    const stale = (result.data ?? [])
      .map((ticket, index) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? tokens[index]?.token : null))
      .filter((token): token is string => Boolean(token));
    if (stale.length) await prisma.pushToken.deleteMany({ where: { token: { in: stale } } });
  } catch (error) {
    console.error("[push]", error instanceof Error ? error.message : error);
  }
}
