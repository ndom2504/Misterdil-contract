import { fieldsFor, sectorById } from "@/lib/catalog";
import { progressFromSections, type ProgressStats } from "@/lib/progress";
import { resolveAccess } from "@/server/access";
import type { SessionUser } from "@/server/current-user";
import { prisma } from "@/server/db";
import { loadDocumentForUser } from "@/server/guard";

function iso(value: Date) {
  return value.toISOString();
}

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export type DocumentSummary = {
  id: string;
  title: string;
  typeId: string;
  typeLabel: string;
  status: string;
  sector: string;
  sectorLabel: string;
  domain: string;
  updatedAt: string;
  workspaceId: string;
  workspaceName: string;
  moderatorName: string;
  participants: number;
  progress: ProgressStats;
};

export async function listDocuments(user: SessionUser): Promise<DocumentSummary[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: {
      workspace: {
        include: {
          documents: {
            include: {
              type: true,
              moderator: true,
              sections: true,
              stakeholders: true,
            },
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });

  const documents: DocumentSummary[] = [];
  for (const membership of memberships) {
    for (const document of membership.workspace.documents) {
      const stakeholder = document.stakeholders.find(
        (item) => item.userId === user.id || item.email.toLowerCase() === user.email.toLowerCase(),
      );
      const access = resolveAccess({
        workspaceRole: membership.role,
        stakeholderRole: stakeholder?.accessRole ?? null,
        isStakeholder: Boolean(stakeholder),
        isDocumentModerator: document.moderatorId === user.id,
      });
      if (!access) continue;
      const sector = sectorById(document.sector);
      documents.push({
        id: document.id,
        title: document.title,
        typeId: document.typeId,
        typeLabel: document.type.label,
        status: document.status,
        sector: document.sector,
        sectorLabel: sector?.label ?? document.sector,
        domain: document.domain,
        updatedAt: iso(document.updatedAt),
        workspaceId: document.workspaceId,
        workspaceName: membership.workspace.name,
        moderatorName: document.moderator?.name ?? "Non désigné",
        participants: document.stakeholders.length,
        progress: progressFromSections(document.sections),
      });
    }
  }

  return documents.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

export async function getDashboard(user: SessionUser) {
  const documents = await listDocuments(user);
  const workspaceCount = await prisma.workspaceMember.count({ where: { userId: user.id } });
  const activities = await prisma.activity.findMany({
    where: {
      OR: [
        { documentId: { in: documents.map((document) => document.id) } },
        {
          documentId: null,
          workspaceId: { in: [...new Set(documents.map((document) => document.workspaceId))] },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const focus =
    documents.find((document) => document.status === "IN_DISCUSSION") ??
    documents.find((document) => document.status !== "FINAL") ??
    documents[0] ??
    null;

  return {
    workspaceCount,
    documents: documents.slice(0, 6),
    counts: {
      active: documents.filter((document) => document.status !== "FINAL").length,
      discussion: documents.filter((document) => document.status === "IN_DISCUSSION").length,
      validation: documents.filter((document) => document.status === "PENDING_VALIDATION").length,
      signature: documents.filter((document) => document.status === "PENDING_SIGNATURE").length,
      final: documents.filter((document) => document.status === "FINAL").length,
    },
    activities: activities.map((item) => ({
      id: item.id,
      kind: item.kind,
      message: item.message,
      createdAt: iso(item.createdAt),
      href: item.documentId ? `/documents/${item.documentId}` : item.workspaceId ? `/espaces/${item.workspaceId}` : "/activite",
    })),
    focus,
  };
}

export async function listWorkspaces(user: SessionUser) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: {
      workspace: {
        include: {
          members: true,
          documents: { include: { sections: true, stakeholders: true, type: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((membership) => {
    const visible = membership.workspace.documents.filter((document) => {
      const stakeholder = document.stakeholders.find(
        (item) => item.userId === user.id || item.email.toLowerCase() === user.email.toLowerCase(),
      );
      return resolveAccess({
        workspaceRole: membership.role,
        stakeholderRole: stakeholder?.accessRole ?? null,
        isStakeholder: Boolean(stakeholder),
        isDocumentModerator: document.moderatorId === user.id,
      });
    });
    const sections = visible.flatMap((document) => document.sections);
    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      description: membership.workspace.description,
      sector: sectorById(membership.workspace.sector ?? "")?.label ?? membership.workspace.sector ?? "",
      domain: membership.workspace.domain ?? "",
      role: membership.role,
      participants: membership.workspace.members.length,
      documents: visible.map((document) => ({
        id: document.id,
        title: document.title,
        typeLabel: document.type.label,
        typeId: document.typeId,
        status: document.status,
      })),
      progress: progressFromSections(sections),
      updatedAt: iso(membership.workspace.updatedAt),
    };
  });
}

export async function getWorkspace(user: SessionUser, workspaceId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    include: {
      workspace: {
        include: {
          organization: true,
          members: { include: { user: { include: { organization: true } } } },
          documents: {
            include: { type: true, sections: true, stakeholders: true, moderator: true },
            orderBy: { updatedAt: "desc" },
          },
          attachments: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!membership) return null;
  const workspace = membership.workspace;
  const documents = workspace.documents.filter((document) => {
    const stakeholder = document.stakeholders.find(
      (item) => item.userId === user.id || item.email.toLowerCase() === user.email.toLowerCase(),
    );
    return resolveAccess({
      workspaceRole: membership.role,
      stakeholderRole: stakeholder?.accessRole ?? null,
      isStakeholder: Boolean(stakeholder),
      isDocumentModerator: document.moderatorId === user.id,
    });
  });

  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    sector: workspace.sector ?? "",
    sectorLabel: sectorById(workspace.sector ?? "")?.label ?? "",
    domain: workspace.domain ?? "",
    organization: workspace.organization.name,
    role: membership.role,
    canManage: membership.role === "ADMINISTRATOR" || membership.role === "CREATOR" || membership.role === "MODERATOR",
    members: workspace.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      jobTitle: member.user.jobTitle ?? "",
      organization: member.user.organization?.name ?? "",
      role: member.role,
    })),
    documents: documents.map((document) => ({
      id: document.id,
      title: document.title,
      typeId: document.typeId,
      typeLabel: document.type.label,
      status: document.status,
      moderatorName: document.moderator?.name ?? "Non désigné",
      participants: document.stakeholders.length,
      progress: progressFromSections(document.sections),
      updatedAt: iso(document.updatedAt),
    })),
    attachments: workspace.attachments.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: iso(file.createdAt),
    })),
    progress: progressFromSections(documents.flatMap((document) => document.sections)),
  };
}

function responseMap(responses: { fieldKey: string; value: string }[]) {
  return Object.fromEntries(responses.map((item) => [item.fieldKey, item.value]));
}

export async function getDocumentView(user: SessionUser, documentId: string) {
  const loaded = await loadDocumentForUser(documentId, user);
  if (!loaded) return null;
  const { document, access } = loaded;
  const responses = responseMap(document.responses);
  const sector = sectorById(document.sector);
  const missing = fieldsFor(document.typeId, document.sector)
    .filter((field) => field.required && !responses[field.key]?.trim())
    .map((field) => field.label);

  const spec = await prisma.document.findFirst({
    where: {
      workspaceId: document.workspaceId,
      typeId: "cahier-des-charges",
      NOT: { id: document.id },
    },
    include: { stakeholders: true },
  });
  let linkedSpec: { id: string; title: string } | null = null;
  if (spec) {
    const stakeholder = spec.stakeholders.find(
      (item) => item.userId === user.id || item.email.toLowerCase() === user.email.toLowerCase(),
    );
    const specAccess = resolveAccess({
      workspaceRole: access.workspaceRole,
      stakeholderRole: stakeholder?.accessRole ?? null,
      isStakeholder: Boolean(stakeholder),
      isDocumentModerator: spec.moderatorId === user.id,
    });
    if (specAccess) linkedSpec = { id: spec.id, title: spec.title };
  }

  const finalApprovals = document.approvals.filter((item) => !item.sectionId);
  const readyForFinal =
    document.sections.length > 0 &&
    document.sections.every((section) => section.status === "VALIDATED" || section.status === "LOCKED");

  return {
    id: document.id,
    title: document.title,
    typeId: document.typeId,
    typeLabel: document.type.label,
    status: document.status,
    sector: document.sector,
    sectorLabel: sector?.label ?? document.sector,
    domain: document.domain,
    description: document.description,
    brief: document.briefJson ? (JSON.parse(document.briefJson) as { objectif?: string; client?: string; prestataire?: string; duree?: string }) : null,
    briefConfirmed: document.briefConfirmed,
    wizardStep: document.wizardStep,
    workspaceId: document.workspaceId,
    workspaceName: document.workspace.name,
    moderatorId: document.moderatorId,
    moderatorName: document.moderator?.name ?? "Non désigné",
    updatedAt: iso(document.updatedAt),
    progress: progressFromSections(document.sections),
    missing,
    responses,
    readyForFinal,
    partiesApproved: finalApprovals.length > 0 && finalApprovals.every((item) => item.status === "APPROVED"),
    access: {
      canEdit: access.canEdit,
      canComment: access.canComment,
      canPropose: access.canPropose,
      canValidate: access.canValidate,
      canLock: access.canLock,
      canInvite: access.canInvite,
      isModerator: access.isModerator,
      documentRole: access.documentRole,
    },
    sections: document.sections.map((section) => ({
      id: section.id,
      anchor: section.anchor,
      title: section.title,
      content: section.content,
      status: section.status,
      position: section.position,
    })),
    stakeholders: document.stakeholders.map((item) => ({
      id: item.id,
      userId: item.userId,
      name: item.name,
      organization: item.organization,
      partyType: item.partyType,
      email: item.email,
      phone: item.phone,
      representative: item.representative,
      jobTitle: item.jobTitle,
      address: item.address,
      accessRole: item.accessRole,
      isCurrentUser: item.userId === user.id || item.email.toLowerCase() === user.email.toLowerCase(),
    })),
    discussions: document.discussions.map((discussion) => ({
      id: discussion.id,
      sectionId: discussion.sectionId,
      title: discussion.title,
      status: discussion.status,
      createdAt: iso(discussion.createdAt),
      comments: discussion.comments.map((comment) => ({
        id: comment.id,
        authorName: comment.authorName,
        body: comment.body,
        isAi: comment.isAi,
        createdAt: iso(comment.createdAt),
      })),
    })),
    proposals: document.proposals.map((proposal) => ({
      id: proposal.id,
      sectionId: proposal.sectionId,
      sectionTitle: proposal.section.title,
      authorName: proposal.authorName,
      isAi: proposal.isAi,
      summary: proposal.summary,
      previousText: proposal.previousText,
      proposedText: proposal.proposedText,
      status: proposal.status,
      createdAt: iso(proposal.createdAt),
    })),
    approvals: finalApprovals.map((item) => ({
      id: item.id,
      userId: item.userId,
      name: item.user.name,
      roleLabel: item.roleLabel,
      status: item.status,
      decidedAt: item.decidedAt ? iso(item.decidedAt) : null,
    })),
    signatures: document.signatures.map((item) => ({
      id: item.id,
      stakeholderId: item.stakeholderId,
      name: item.stakeholder.name,
      organization: item.stakeholder.organization,
      partyType: item.stakeholder.partyType,
      status: item.status,
      signerName: item.signerName,
      signerEmail: item.signerEmail,
      signedAt: item.signedAt ? iso(item.signedAt) : null,
      method: item.method,
      canSign: item.status === "REQUIRED" && (item.stakeholder.userId === user.id || item.stakeholder.email.toLowerCase() === user.email.toLowerCase()),
    })),
    versions: document.versions.map((version) => ({
      id: version.id,
      label: version.label,
      createdByName: version.createdByName,
      createdAt: iso(version.createdAt),
      sections: JSON.parse(version.snapshot) as { title: string; content: string; status: string }[],
    })),
    activities: document.activities.map((item) => ({
      id: item.id,
      kind: item.kind,
      actorName: item.actorName,
      message: item.message,
      createdAt: iso(item.createdAt),
    })),
    attachments: document.attachments.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: iso(file.createdAt),
    })),
    members: document.workspace.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
    })),
    linkedSpec,
  };
}

export async function listNotifications(userId: string) {
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return items.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    body: item.body,
    href: item.href,
    read: item.read,
    createdAt: iso(item.createdAt),
  }));
}

export async function notificationPreview(userId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return {
    unread,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href,
      read: item.read,
      createdAt: iso(item.createdAt),
    })),
  };
}

export async function listCollaborators(user: SessionUser) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: {
      workspace: {
        include: { members: { include: { user: { include: { organization: true } } } } },
      },
    },
  });

  const people = new Map<string, {
    id: string;
    name: string;
    email: string;
    jobTitle: string;
    organization: string;
    workspaces: { id: string; name: string; role: string }[];
  }>();

  for (const membership of memberships) {
    for (const member of membership.workspace.members) {
      const current = people.get(member.user.id) ?? {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        jobTitle: member.user.jobTitle ?? "",
        organization: member.user.organization?.name ?? "",
        workspaces: [],
      };
      current.workspaces.push({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: member.role,
      });
      people.set(member.user.id, current);
    }
  }

  return [...people.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function listActivity(user: SessionUser) {
  const documents = await listDocuments(user);
  const items = await prisma.activity.findMany({
    where: { documentId: { in: documents.map((document) => document.id) } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return items.map((item) => ({
    id: item.id,
    kind: item.kind,
    actorName: item.actorName,
    message: item.message,
    createdAt: iso(item.createdAt),
    href: item.documentId ? `/documents/${item.documentId}` : "/activite",
  }));
}

export async function listDiscussions(user: SessionUser) {
  const documents = await listDocuments(user);
  const threads = await prisma.discussion.findMany({
    where: { documentId: { in: documents.map((document) => document.id) } },
    include: { comments: { orderBy: { createdAt: "desc" }, take: 1 }, document: true },
    orderBy: { updatedAt: "desc" },
  });
  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    status: thread.status,
    documentId: thread.documentId,
    documentTitle: thread.document.title,
    lastAuthor: thread.comments[0]?.authorName ?? "",
    lastBody: thread.comments[0]?.body ?? "",
    updatedAt: iso(thread.updatedAt),
  }));
}

export async function listSignatureTasks(user: SessionUser) {
  const documents = await listDocuments(user);
  const signatures = await prisma.signature.findMany({
    where: { documentId: { in: documents.map((document) => document.id) } },
    include: { stakeholder: true, document: true },
    orderBy: { createdAt: "desc" },
  });
  return signatures.map((item) => ({
    id: item.id,
    documentId: item.documentId,
    documentTitle: item.document.title,
    documentStatus: item.document.status,
    name: item.stakeholder.name,
    organization: item.stakeholder.organization,
    status: item.status,
    signedAt: item.signedAt ? iso(item.signedAt) : null,
    canSign: item.status === "REQUIRED" && (item.stakeholder.userId === user.id || item.stakeholder.email.toLowerCase() === user.email.toLowerCase()),
  }));
}

export async function searchPlatform(user: SessionUser, query: string) {
  const needle = fold(query.trim());
  const documents = await listDocuments(user);
  if (needle.length < 2) {
    return { documents: [], workspaces: [], people: [], clauses: [], discussions: [] };
  }

  const detailed = await prisma.document.findMany({
    where: { id: { in: documents.map((document) => document.id) } },
    include: {
      sections: true,
      discussions: { include: { comments: true } },
    },
  });
  const allowed = new Map(documents.map((document) => [document.id, document]));

  const clauses = detailed.flatMap((document) =>
    document.sections
      .filter((section) => fold(`${section.title} ${section.content}`).includes(needle))
      .map((section) => ({
        documentId: document.id,
        documentTitle: allowed.get(document.id)?.title ?? document.title,
        title: section.title,
        excerpt: section.content.slice(0, 180),
      })),
  );

  const discussions = detailed.flatMap((document) =>
    document.discussions
      .filter((discussion) =>
        fold(`${discussion.title} ${discussion.comments.map((comment) => comment.body).join(" ")}`).includes(needle),
      )
      .map((discussion) => ({
        documentId: document.id,
        documentTitle: document.title,
        title: discussion.title,
        status: discussion.status,
      })),
  );

  const workspaces = (await listWorkspaces(user)).filter((workspace) =>
    fold(`${workspace.name} ${workspace.description} ${workspace.domain}`).includes(needle),
  );
  const people = (await listCollaborators(user)).filter((person) =>
    fold(`${person.name} ${person.email} ${person.organization}`).includes(needle),
  );

  return {
    documents: documents.filter((document) =>
      fold(`${document.title} ${document.typeLabel} ${document.workspaceName} ${document.domain}`).includes(needle),
    ),
    workspaces,
    people,
    clauses: clauses.slice(0, 12),
    discussions,
  };
}

export async function assistantHistory(userId: string, documentId?: string) {
  const items = await prisma.aiInteraction.findMany({
    where: { userId, documentId: documentId || null },
    orderBy: { createdAt: "asc" },
    take: 40,
  });
  return items.map((item) => ({
    id: item.id,
    role: item.role,
    content: item.content,
    createdAt: iso(item.createdAt),
  }));
}

export async function buildAssistantContext(user: SessionUser, documentId?: string) {
  if (!documentId) {
    return { userName: user.name, document: null };
  }
  const view = await getDocumentView(user, documentId);
  if (!view) return { userName: user.name, document: null };
  return {
    userName: user.name,
    document: {
      title: view.title,
      typeLabel: view.typeLabel,
      sector: view.sectorLabel,
      domain: view.domain,
      description: view.description,
      status: view.status,
      moderator: view.moderatorName,
      progress: view.progress,
      sections: view.sections.map((section) => ({
        title: section.title,
        anchor: section.anchor,
        status: section.status,
        content: section.content.slice(0, 1200),
      })),
      parties: view.stakeholders.map((item) => ({
        name: item.name,
        organization: item.organization,
        partyType: item.partyType,
      })),
      discussions: view.discussions.map((discussion) => ({
        title: discussion.title,
        status: discussion.status === "OPEN" ? "OPEN" : "RESOLVED",
        comments: discussion.comments.map((comment) => ({ author: comment.authorName, body: comment.body })),
      })),
      proposals: view.proposals.map((proposal) => ({
        author: proposal.authorName,
        status: proposal.status,
        previousText: proposal.previousText,
        proposedText: proposal.proposedText,
        sectionTitle: proposal.sectionTitle,
      })),
      activities: view.activities.slice(0, 8).map((item) => ({
        message: item.message,
        createdAt: item.createdAt,
      })),
      missing: view.missing,
    },
  };
}
