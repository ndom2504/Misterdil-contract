import { createHash, randomBytes } from "crypto";
import type { MailWindow, MeetingWindow } from "@/lib/microsoft-desk";
import { prisma } from "@/server/db";

const SCOPES = ["openid", "profile", "email", "offline_access", "User.Read", "Mail.Read", "Mail.ReadWrite", "Mail.Send", "Calendars.Read", "Calendars.ReadWrite"];
// Accounts connected before the scope was stored only consented to these; a refresh asking
// for more than was consented is rejected.
const LEGACY_SCOPES = SCOPES.filter((scope) => scope !== "Calendars.ReadWrite");
const ZONE = "America/Toronto";

export type MicrosoftBoard = {
  configured: boolean;
  connected: boolean;
  email: string;
  error: string;
  mail: MailWindow[];
  meetings: MeetingWindow[];
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error_description?: string;
};

function configured() {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export function microsoftRedirectUri(origin: string) {
  return process.env.MICROSOFT_REDIRECT_URI || `${origin}/api/auth/microsoft/callback`;
}

export function microsoftAuthorizeUrl(origin: string, state: string, verifier: string) {
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", process.env.MICROSOFT_CLIENT_ID ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", microsoftRedirectUri(origin));
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export function createMicrosoftProof() {
  return {
    state: randomBytes(16).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
  };
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || "Jeton Microsoft refusé.");
  }
  return payload;
}

export async function exchangeMicrosoftCode(origin: string, code: string, verifier: string) {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    grant_type: "authorization_code",
    code,
    redirect_uri: microsoftRedirectUri(origin),
    code_verifier: verifier,
  });
  return tokenRequest(body);
}

async function graph<T>(token: string, path: string) {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'outlook.body-content-type="text", outlook.timezone="America/Toronto"',
    },
  });
  if (!response.ok) {
    const error = new Error(response.status === 403 ? "consent" : "graph") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return (await response.json()) as T;
}

function plain(body: { contentType?: string; content?: string } | undefined) {
  const content = body?.content ?? "";
  if (body?.contentType === "html") {
    return content
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  }
  return content.trim();
}

function stamp(value?: string) {
  if (!value) return new Date().toISOString();
  const cleaned = value.replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(cleaned.endsWith("Z") || cleaned.includes("+") ? cleaned : `${cleaned}Z`);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function zoneDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function whenLabel(value: string) {
  const [date, time = ""] = value.split("T");
  const [, month, day] = date.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ""} · ${time.slice(0, 5)}`;
}

function clockLabel(value: string) {
  const [date, time = ""] = value.split("T");
  if (date === zoneDay(new Date())) return time.slice(0, 5);
  const [, month, day] = date.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ""}`;
}

function meetingParts(value: string) {
  const [date, time = ""] = value.split("T");
  const [, month, day] = date.split("-");
  const hm = time.slice(0, 5);
  const today = zoneDay(new Date());
  const tomorrow = zoneDay(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const dayLabel = date === today ? "Aujourd'hui" : date === tomorrow ? "Demain" : `${Number(day)} ${MONTHS[Number(month) - 1] ?? ""}`;
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const past = date < today || (date === today && hm < now);
  return { day: dayLabel, time: hm, past };
}

function findAccount(userId: string) {
  return prisma.microsoftAccount.findUnique({
    where: { userId },
    select: { id: true, email: true, accessToken: true, refreshToken: true, expiresAt: true, scope: true },
  });
}

function grantedScopes(scope: string) {
  if (!scope.trim()) return LEGACY_SCOPES;
  const granted = scope.split(/\s+/).filter(Boolean).map((item) => item.replace(/^https:\/\/graph\.microsoft\.com\//i, ""));
  return [...new Set(["offline_access", ...granted])];
}

function canWriteCalendar(scope: string) {
  return grantedScopes(scope).some((item) => item.toLowerCase() === "calendars.readwrite");
}

async function freshAccessToken(account: { id: string; accessToken: string; refreshToken: string; expiresAt: Date; scope: string }) {
  if (account.expiresAt.getTime() > Date.now() + 60_000) return account.accessToken;
  if (!account.refreshToken) throw new Error("refresh");
  const payload = await tokenRequest(new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
    scope: grantedScopes(account.scope).join(" "),
  }));
  const expiresAt = new Date(Date.now() + (payload.expires_in ?? 3600) * 1000);
  const accessToken = payload.access_token ?? account.accessToken;
  const refreshToken = payload.refresh_token || account.refreshToken;
  await prisma.microsoftAccount.update({
    where: { id: account.id },
    data: { accessToken, refreshToken, expiresAt, ...(payload.scope ? { scope: payload.scope } : {}) },
  });
  return accessToken;
}

export async function saveMicrosoftAccount(userId: string, token: TokenResponse) {
  const profile = await graph<{ mail?: string; userPrincipalName?: string }>(token.access_token ?? "", "/me?$select=mail,userPrincipalName");
  const email = profile.mail || profile.userPrincipalName || "";
  const expiresAt = new Date(Date.now() + (token.expires_in ?? 3600) * 1000);
  const accessToken = token.access_token ?? "";
  const scope = token.scope ?? "";
  await prisma.microsoftAccount.upsert({
    where: { userId },
    create: { userId, email, accessToken, refreshToken: token.refresh_token ?? "", expiresAt, scope },
    update: { email, accessToken, expiresAt, scope, ...(token.refresh_token ? { refreshToken: token.refresh_token } : {}) },
  });
  return email;
}

export async function getMicrosoftBoard(userId: string): Promise<MicrosoftBoard> {
  const empty: MicrosoftBoard = { configured: configured(), connected: false, email: "", error: "", mail: [], meetings: [] };
  if (!empty.configured) return empty;
  const account = await findAccount(userId).catch(() => null);
  if (!account) return empty;
  try {
    const token = await freshAccessToken(account);
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const [mail, calendar] = await Promise.all([
      graph<{ value: { id: string; subject?: string; importance?: string; categories?: string[]; from?: { emailAddress?: { name?: string; address?: string } }; receivedDateTime?: string; bodyPreview?: string; isRead?: boolean; body?: { contentType?: string; content?: string } }[] }>(
        token,
        "/me/messages?$top=12&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,body,importance,categories&$orderby=receivedDateTime desc",
      ),
      graph<{ value: { id: string; subject?: string; isOnlineMeeting?: boolean; start?: { dateTime?: string }; organizer?: { emailAddress?: { name?: string } }; attendees?: unknown[]; onlineMeeting?: { joinUrl?: string } }[] }>(
        token,
        `/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}&$select=subject,start,isOnlineMeeting,onlineMeeting,organizer,attendees&$orderby=start/dateTime&$top=20`,
      ),
    ]);
    return {
      configured: true,
      connected: true,
      email: account.email,
      error: "",
      mail: mail.value.map((item) => ({
        id: item.id,
        subject: item.subject || "(Sans objet)",
        from: item.from?.emailAddress?.name || item.from?.emailAddress?.address || "Expéditeur inconnu",
        receivedAt: item.receivedDateTime ? whenLabel(item.receivedDateTime) : "",
        preview: item.bodyPreview ?? "",
        body: plain(item.body) || item.bodyPreview || "",
        unread: item.isRead === false,
        important: item.importance === "high",
        category: item.categories?.[0] ?? "",
        clock: item.receivedDateTime ? clockLabel(item.receivedDateTime) : "",
        at: stamp(item.receivedDateTime),
      })),
      meetings: calendar.value
        .filter((item) => item.isOnlineMeeting)
        .slice(0, 12)
        .map((item) => {
          const parts = item.start?.dateTime ? meetingParts(item.start.dateTime) : { day: "", time: "", past: false };
          return {
            id: item.id,
            subject: item.subject || "Réunion Teams",
            when: item.start?.dateTime ? whenLabel(item.start.dateTime) : "",
            day: parts.day,
            time: parts.time,
            organizer: item.organizer?.emailAddress?.name || "",
            attendees: item.attendees?.length ?? 0,
            joinUrl: item.onlineMeeting?.joinUrl || "",
            past: parts.past,
            at: stamp(item.start?.dateTime),
          };
        }),
    };
  } catch (error) {
    const status = (error as { status?: number }).status;
    return {
      configured: true,
      connected: true,
      email: account.email,
      error: status === 403
        ? "Un administrateur Microsoft doit accepter l'accès aux courriels et au calendrier."
        : "La connexion Microsoft a expiré. Reconnectez le compte.",
      mail: [],
      meetings: [],
    };
  }
}

async function graphWrite(token: string, path: string, method: string, body?: unknown) {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = new Error("graph") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return (await response.json().catch(() => null)) as unknown;
}

export async function mailAction(userId: string, messageId: string, action: "read" | "archive" | "reply", comment = "") {
  const account = await findAccount(userId).catch(() => null);
  if (!account) return { ok: false as const, error: "Connectez Microsoft." };
  try {
    const token = await freshAccessToken(account);
    const id = encodeURIComponent(messageId);
    if (action === "read") {
      await graphWrite(token, `/me/messages/${id}`, "PATCH", { isRead: true });
    } else if (action === "reply") {
      const text = comment.trim();
      if (text.length < 2) return { ok: false as const, error: "Écrivez la réponse." };
      await graphWrite(token, `/me/messages/${id}/reply`, "POST", { comment: text });
    } else {
      const folder = await graph<{ id: string }>(token, "/me/mailFolders/archive");
      await graphWrite(token, `/me/messages/${id}/move`, "POST", { destinationId: folder.id });
    }
    return { ok: true as const };
  } catch (error) {
    const status = (error as { status?: number }).status;
    return {
      ok: false as const,
      error: status === 403
        ? "Reconnectez Microsoft pour autoriser la réponse, la lecture et l'archivage."
        : "L'action Outlook n'a pas abouti.",
    };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

// Sent from the inviter's own mailbox, so replies reach them directly.
export async function sendInvitationMail(
  userId: string,
  input: { to: string; toName: string; inviterName: string; organization: string; title: string; link: string },
) {
  if (!configured()) return false;
  const account = await findAccount(userId).catch(() => null);
  if (!account) return false;
  const from = input.organization ? `${input.inviterName} (${input.organization})` : input.inviterName;
  const html = [
    `<p>Bonjour ${escapeHtml(input.toName || "")},</p>`,
    `<p>${escapeHtml(from)} vous invite à participer à l'entente <strong>« ${escapeHtml(input.title)} »</strong> sur Misterdil.</p>`,
    `<p>Créez votre compte pour consulter le document, le modifier avec les autres parties et suivre les échanges en direct.</p>`,
    `<p><a href="${escapeHtml(input.link)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#1e4ed8;color:#ffffff;text-decoration:none;font-weight:600">Rejoindre l'entente</a></p>`,
    `<p style="color:#5e6875;font-size:13px">Ou copiez ce lien : ${escapeHtml(input.link)}</p>`,
    `<p style="color:#5e6875;font-size:13px">Misterdil · Une collaboration plus smart</p>`,
  ].join("");
  try {
    const token = await freshAccessToken(account);
    await graphWrite(token, "/me/sendMail", "POST", {
      message: {
        subject: `${input.inviterName} vous invite à l'entente « ${input.title} »`,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: input.to, name: input.toName || input.to } }],
      },
      saveToSentItems: true,
    });
    return true;
  } catch (error) {
    console.error(`[invitation] envoi Outlook refusé (${(error as { status?: number }).status ?? "?"})`);
    return false;
  }
}

export type OutlookResult =
  | { status: "created"; eventId: string; joinUrl: string }
  | { status: "skipped" }
  | { status: "failed"; hint: string };

// Times are wall-clock values in the Toronto zone ("2026-10-05T14:00"). Meetings invite
// the attendees from the organizer's mailbox; deadlines only land in the organizer's calendar.
export async function createOutlookEvent(
  userId: string,
  input: {
    kind: "MEETING" | "DEADLINE";
    title: string;
    notes: string;
    location: string;
    start: string;
    end: string;
    online: boolean;
    link: string;
    attendees: { email: string; name: string }[];
  },
): Promise<OutlookResult> {
  if (!configured()) return { status: "skipped" };
  const account = await findAccount(userId).catch(() => null);
  if (!account) return { status: "skipped" };
  if (!canWriteCalendar(account.scope)) {
    return { status: "failed", hint: "Reconnectez Microsoft dans votre profil pour autoriser l'ajout au calendrier Outlook." };
  }
  const meeting = input.kind === "MEETING";
  const html = [
    input.notes ? `<p>${escapeHtml(input.notes).replace(/\n/g, "<br>")}</p>` : "",
    `<p><a href="${escapeHtml(input.link)}">Ouvrir l'entente sur Misterdil</a></p>`,
  ].join("");
  const event = {
    subject: meeting ? input.title : `Échéance · ${input.title}`,
    body: { contentType: "HTML", content: html },
    start: { dateTime: `${input.start}:00`, timeZone: ZONE },
    end: { dateTime: `${input.end}:00`, timeZone: ZONE },
    ...(input.location ? { location: { displayName: input.location } } : {}),
    ...(meeting
      ? { attendees: input.attendees.map((person) => ({ emailAddress: { address: person.email, name: person.name || person.email }, type: "required" })) }
      : { showAs: "free", isReminderOn: true, reminderMinutesBeforeStart: 24 * 60 }),
  };
  try {
    type Created = { id?: string; onlineMeeting?: { joinUrl?: string } } | null;
    const token = await freshAccessToken(account);
    // Teams links need a work or school account; personal accounts get a plain invitation.
    const online = meeting && input.online
      ? ((await graphWrite(token, "/me/events", "POST", { ...event, isOnlineMeeting: true, onlineMeetingProvider: "teamsForBusiness" }).catch(
          () => null,
        )) as Created)
      : null;
    const created = online ?? ((await graphWrite(token, "/me/events", "POST", event)) as Created);
    return { status: "created", eventId: created?.id ?? "", joinUrl: created?.onlineMeeting?.joinUrl ?? "" };
  } catch (error) {
    const status = (error as { status?: number }).status;
    console.error(`[agenda] création Outlook refusée (${status ?? "?"})`);
    return {
      status: "failed",
      hint: status === 401 || status === 403
        ? "Reconnectez Microsoft dans votre profil pour autoriser l'ajout au calendrier Outlook."
        : "L'invitation Outlook n'a pas pu être créée.",
    };
  }
}

// Deleting an event the account organizes also sends the cancellation to its attendees.
export async function cancelOutlookEvent(userId: string, eventId: string) {
  if (!configured() || !eventId) return;
  const account = await findAccount(userId).catch(() => null);
  if (!account || !canWriteCalendar(account.scope)) return;
  try {
    const token = await freshAccessToken(account);
    await graphWrite(token, `/me/events/${encodeURIComponent(eventId)}`, "DELETE");
  } catch (error) {
    console.error(`[agenda] annulation Outlook refusée (${(error as { status?: number }).status ?? "?"})`);
  }
}

export async function microsoftAlerts(userId: string) {
  try {
    const board = await getMicrosoftBoard(userId);
    if (!board.connected) return [];
    const mail = board.mail.slice(0, 4).map((item) => ({
      id: `mail-${item.id}`,
      kind: "outlook" as const,
      title: `Outlook · ${item.subject}`,
      body: `${item.from} · ${item.preview}`,
      href: `/accueil?message=${encodeURIComponent(item.id)}`,
      read: !item.unread,
      createdAt: item.at,
    }));
    const meetings = board.meetings.slice(0, 3).map((item) => ({
      id: `meet-${item.id}`,
      kind: "teams" as const,
      title: `Teams · ${item.subject}`,
      body: `${item.when}${item.organizer ? ` · ${item.organizer}` : ""}`,
      href: `/accueil?reunion=${encodeURIComponent(item.id)}`,
      read: true,
      createdAt: item.at,
    }));
    return [...mail, ...meetings];
  } catch {
    return [];
  }
}
