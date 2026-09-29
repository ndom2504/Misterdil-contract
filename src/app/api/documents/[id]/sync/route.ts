import { NextResponse, type NextRequest } from "next/server";
import { ONLINE_WINDOW_MS, type SyncPayload } from "@/lib/document-sync";
import { prisma } from "@/server/db";
import { documentAccess } from "@/server/guard";
import { readSessionUserId } from "@/server/session";

// Clocks of serverless instances drift a little; re-sending a few seconds of changes is harmless.
const OVERLAP_MS = 5000;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const userId = await readSessionUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const allowed = await documentAccess(id, user);
  if (!allowed) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });

  const params = request.nextUrl.searchParams;
  const sinceRaw = params.get("since") ?? "";
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(Date.parse(sinceRaw) - OVERLAP_MS) : null;
  const editing = params.get("section") ?? "";
  const sectionId = editing && editing.length <= 64 && allowed.access.canWrite ? editing : null;
  const now = new Date();

  await prisma.presence.upsert({
    where: { userId_documentId: { userId: user.id, documentId: id } },
    update: { lastSeenAt: now, sectionId },
    create: { userId: user.id, documentId: id, sectionId, lastSeenAt: now },
  });

  const [presences, sections, lastActivity, comments, proposals, stakeholders] = await Promise.all([
    prisma.presence.findMany({
      where: { documentId: id },
      include: { user: { select: { name: true, jobTitle: true, organization: { select: { name: true } } } } },
    }),
    since
      ? prisma.documentSection.findMany({
          where: { documentId: id, updatedAt: { gt: since } },
          select: { id: true, content: true, status: true, updatedAt: true, updatedById: true, updatedByName: true },
        })
      : Promise.resolve([]),
    prisma.activity.findFirst({ where: { documentId: id }, orderBy: { createdAt: "desc" }, select: { id: true } }),
    prisma.comment.count({ where: { discussion: { documentId: id } } }),
    prisma.proposal.count({ where: { documentId: id, status: "PENDING" } }),
    prisma.stakeholder.findMany({
      where: { documentId: id },
      select: { userId: true, email: true, invitedAt: true },
      orderBy: [{ email: "asc" }, { name: "asc" }],
    }),
  ]);

  const payload: SyncPayload = {
    now: now.toISOString(),
    // Anything the section merge cannot carry (comments, proposals, parties, status) changes this value,
    // and the client then refreshes the whole view.
    signal: [
      allowed.document.status,
      allowed.document.sentAt?.toISOString() ?? "",
      lastActivity?.id ?? "",
      comments,
      proposals,
      stakeholders.map((item) => `${item.email}:${item.userId ?? "-"}:${item.invitedAt ? 1 : 0}`).join(","),
    ].join("|"),
    presence: presences.map((item) => ({
      userId: item.userId,
      name: item.user.name,
      organization: item.user.organization?.name ?? "",
      jobTitle: item.user.jobTitle ?? "",
      sectionId: item.sectionId,
      lastSeenAt: item.lastSeenAt.toISOString(),
      online: now.getTime() - item.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
    })),
    sections: sections.map((section) => ({
      id: section.id,
      content: section.content,
      status: section.status,
      updatedAt: section.updatedAt.toISOString(),
      updatedById: section.updatedById,
      updatedByName: section.updatedByName,
    })),
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
