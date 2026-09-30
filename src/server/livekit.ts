import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

type LiveKitConfig = { url: string; apiKey: string; apiSecret: string };

function config(): LiveKitConfig | null {
  const url = (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "").trim();
  const apiKey = (process.env.LIVEKIT_API_KEY ?? "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET ?? "").trim();
  return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}

export function livekitConfigured() {
  return Boolean(config());
}

export function callRoom(documentId: string) {
  return `entente-${documentId}`;
}

export async function callToken(documentId: string, user: { id: string; name: string; avatarUrl: string }) {
  const settings = config();
  if (!settings) return null;
  const room = callRoom(documentId);
  const token = new AccessToken(settings.apiKey, settings.apiSecret, {
    identity: user.id,
    name: user.name,
    metadata: JSON.stringify({ avatarUrl: user.avatarUrl }),
    ttl: "2h",
  });
  token.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
  return { url: settings.url, token: await token.toJwt(), room };
}

export type CallParticipant = { id: string; name: string };

// Polled by every open chat, so the answer is shared for a few seconds per room.
const cache = new Map<string, { at: number; participants: CallParticipant[] }>();
const CACHE_MS = 4000;

export async function callParticipants(documentId: string, fresh = false): Promise<CallParticipant[]> {
  const settings = config();
  if (!settings) return [];
  const room = callRoom(documentId);
  const cached = cache.get(room);
  if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.participants;
  let participants: CallParticipant[] = [];
  try {
    const client = new RoomServiceClient(settings.url.replace(/^ws/, "http"), settings.apiKey, settings.apiSecret);
    const list = await client.listParticipants(room);
    participants = list.map((item) => ({ id: item.identity, name: item.name || item.identity }));
  } catch {
    // The room does not exist until someone joins it.
  }
  cache.set(room, { at: Date.now(), participants });
  return participants;
}
