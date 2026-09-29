import { headers } from "next/headers";
import { prisma } from "@/server/db";
import { notifyUser, recordActivity } from "@/server/journal";
import { sendInvitationMail } from "@/server/microsoft";

export type PartyInput = {
  name: string;
  organization: string;
  partyType: string;
  email: string;
  phone: string;
  representative: string;
  jobTitle: string;
  address: string;
  accessRole: string;
};

export type ShareResult = {
  name: string;
  email: string;
  status: "notified" | "emailed" | "link";
  link: string;
};

export function cleanParties(parties: PartyInput[]) {
  return parties
    .map((party) => ({
      ...party,
      name: party.name.trim(),
      organization: party.organization.trim(),
      email: party.email.trim().toLowerCase(),
      phone: party.phone.trim(),
      representative: party.representative.trim(),
      jobTitle: party.jobTitle.trim(),
      address: party.address.trim(),
    }))
    .filter((party) => party.name || party.organization);
}

export function workspaceRoleFor(accessRole: string) {
  if (accessRole === "READER") return "READER";
  if (accessRole === "MODERATOR") return "MODERATOR";
  return "PARTICIPANT";
}

export async function appOrigin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Replaces the party list while keeping what earlier saves established: the linked
// account (someone may have joined with another email) and the invitation date.
export async function replaceStakeholders(documentId: string, parties: ReturnType<typeof cleanParties>) {
  const previous = await prisma.stakeholder.findMany({ where: { documentId } });
  const byEmail = new Map(previous.filter((item) => item.email).map((item) => [item.email.toLowerCase(), item]));
  await prisma.stakeholder.deleteMany({ where: { documentId } });
  await prisma.invitation.updateMany({
    where: { documentId, status: "PENDING", email: { notIn: parties.map((party) => party.email).filter(Boolean) } },
    data: { status: "REVOKED" },
  });
  for (const party of parties) {
    const before = party.email ? byEmail.get(party.email) : undefined;
    const account = !before?.userId && party.email ? await prisma.user.findUnique({ where: { email: party.email }, select: { id: true } }) : null;
    await prisma.stakeholder.create({
      data: {
        documentId,
        userId: before?.userId ?? account?.id ?? null,
        name: party.name || party.organization,
        organization: party.organization,
        partyType: party.partyType || "OTHER",
        email: party.email,
        phone: party.phone,
        representative: party.representative,
        jobTitle: party.jobTitle,
        address: party.address,
        accessRole: party.accessRole || "PARTICIPANT",
        invitedAt: before?.invitedAt ?? null,
      },
    });
  }
}

// Opens the document to every party not invited yet: registered users get access and
// a notification; the others get an invitation link, emailed from the inviter's Outlook.
export async function shareDocument(documentId: string, inviter: { id: string; name: string; organization: string }) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { stakeholders: true },
  });
  if (!document) return [];
  const origin = await appOrigin();
  const results: ShareResult[] = [];

  for (const party of document.stakeholders) {
    if (party.invitedAt || party.userId === inviter.id) continue;
    if (!party.userId && !party.email) continue;
    const account = party.userId
      ? { id: party.userId }
      : await prisma.user.findUnique({ where: { email: party.email }, select: { id: true } });

    if (account) {
      await prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: document.workspaceId, userId: account.id } },
        update: {},
        create: { workspaceId: document.workspaceId, userId: account.id, role: workspaceRoleFor(party.accessRole) },
      });
      await prisma.stakeholder.update({ where: { id: party.id }, data: { userId: account.id, invitedAt: new Date() } });
      await notifyUser({
        userId: account.id,
        kind: "INVITE",
        title: "Invitation à une entente",
        body: `${inviter.name} vous invite à travailler sur « ${document.title} ».`,
        href: `/documents/${documentId}`,
      });
      results.push({ name: party.name, email: party.email, status: "notified", link: "" });
      continue;
    }

    const invitation =
      (await prisma.invitation.findFirst({ where: { documentId, email: party.email, status: "PENDING" } })) ??
      (await prisma.invitation.create({
        data: {
          email: party.email,
          workspaceId: document.workspaceId,
          role: workspaceRoleFor(party.accessRole) === "READER" ? "READER" : "PARTICIPANT",
          documentId,
          invitedById: inviter.id,
        },
      }));
    const link = `${origin}/invitation/${invitation.token}`;
    const emailed = await sendInvitationMail(inviter.id, {
      to: party.email,
      toName: party.representative || party.name,
      inviterName: inviter.name,
      organization: inviter.organization,
      title: document.title,
      link,
    });
    if (emailed) await prisma.invitation.update({ where: { id: invitation.id }, data: { sentAt: new Date() } });
    await prisma.stakeholder.update({ where: { id: party.id }, data: { invitedAt: new Date() } });
    results.push({ name: party.name, email: party.email, status: emailed ? "emailed" : "link", link });
  }

  if (results.length) {
    const emailed = results.filter((item) => item.status === "emailed").length;
    const links = results.filter((item) => item.status === "link").length;
    await recordActivity({
      workspaceId: document.workspaceId,
      documentId,
      actorId: inviter.id,
      actorName: inviter.name,
      kind: "INVITE",
      message: `${inviter.name} a envoyé « ${document.title} » à ${results.length} membre${results.length > 1 ? "s" : ""}${emailed ? `, dont ${emailed} par courriel` : ""}${links ? `, ${links} lien${links > 1 ? "s" : ""} à partager` : ""}.`,
    });
  }
  return results;
}

export async function pendingInvitationLinks(documentId: string) {
  const origin = await appOrigin();
  const invitations = await prisma.invitation.findMany({
    where: { documentId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  return invitations.map((item) => ({ email: item.email, link: `${origin}/invitation/${item.token}`, emailed: Boolean(item.sentAt) }));
}
