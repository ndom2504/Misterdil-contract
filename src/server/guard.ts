import { prisma } from "@/server/db";
import { resolveAccess, type Access } from "@/server/access";
import type { SessionUser } from "@/server/current-user";

const documentInclude = {
  type: true,
  moderator: true,
  createdBy: true,
  workspace: { include: { members: { include: { user: true } } } },
  stakeholders: { include: { user: true } },
  sections: { orderBy: { position: "asc" as const } },
  responses: true,
  discussions: {
    orderBy: { createdAt: "asc" as const },
    include: { comments: { orderBy: { createdAt: "asc" as const } } },
  },
  proposals: { orderBy: { createdAt: "desc" as const }, include: { section: true } },
  approvals: { include: { user: true } },
  signatures: { include: { stakeholder: true }, orderBy: { createdAt: "asc" as const } },
  versions: { orderBy: { createdAt: "desc" as const } },
  activities: { orderBy: { createdAt: "desc" as const } },
  attachments: { orderBy: { createdAt: "desc" as const } },
};

export async function loadDocumentForUser(documentId: string, user: SessionUser) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: documentInclude,
  });
  if (!document) return null;

  const membership = document.workspace.members.find((member) => member.userId === user.id);
  const stakeholder = document.stakeholders.find(
    (item) => item.userId === user.id || item.email.toLowerCase() === user.email.toLowerCase(),
  );
  const access = resolveAccess({
    workspaceRole: membership?.role ?? null,
    stakeholderRole: stakeholder?.accessRole ?? null,
    isStakeholder: Boolean(stakeholder),
    isDocumentModerator: document.moderatorId === user.id,
  });
  if (!access) return null;

  return { document, access, stakeholder };
}

export type LoadedDocument = NonNullable<Awaited<ReturnType<typeof loadDocumentForUser>>>;
export type { Access };
