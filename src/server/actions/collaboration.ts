"use server";

import { partyLabel } from "@/lib/domain";
import { suggestFormulation } from "@/server/ai";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/current-user";
import { loadDocumentForUser } from "@/server/guard";
import { notifyUser, recordActivity, saveVersion, touchDocument } from "@/server/journal";
import { internalSignatureProvider } from "@/server/signature";

type PartyInput = {
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

async function context(documentId: string) {
  const user = await requireUser();
  const loaded = await loadDocumentForUser(documentId, user);
  return { user, loaded };
}

async function notifyOthers(documentId: string, workspaceId: string, exceptUserId: string, input: { kind: string; title: string; body: string; href: string }) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { stakeholders: true },
  });
  if (!document) return;
  const ids = new Set<string>();
  if (document.moderatorId) ids.add(document.moderatorId);
  for (const stakeholder of document.stakeholders) {
    if (stakeholder.userId) ids.add(stakeholder.userId);
  }
  ids.delete(exceptUserId);
  for (const userId of ids) {
    await notifyUser({ userId, ...input });
  }
  void workspaceId;
}

export async function saveParties(documentId: string, parties: PartyInput[], moderatorId: string) {
  const { user, loaded } = await context(documentId);
  if (!loaded?.access.canInvite) return { ok: false as const, error: "Vous ne pouvez pas modifier les parties." };
  if (loaded.document.signatures.length) {
    return { ok: false as const, error: "Les parties sont figées après l'envoi en signature." };
  }
  const cleaned = parties
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
  if (!cleaned.length) return { ok: false as const, error: "Ajoutez au moins une partie." };

  const previous = new Set(loaded.document.stakeholders.map((item) => item.email.toLowerCase()));
  await prisma.stakeholder.deleteMany({ where: { documentId } });

  for (const party of cleaned) {
    const existing = party.email ? await prisma.user.findUnique({ where: { email: party.email } }) : null;
    await prisma.stakeholder.create({
      data: {
        documentId,
        userId: existing?.id,
        name: party.name || party.organization,
        organization: party.organization,
        partyType: party.partyType || "OTHER",
        email: party.email,
        phone: party.phone,
        representative: party.representative,
        jobTitle: party.jobTitle,
        address: party.address,
        accessRole: party.accessRole || "PARTICIPANT",
      },
    });

    if (existing) {
      await prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: loaded.document.workspaceId, userId: existing.id } },
        update: {},
        create: {
          workspaceId: loaded.document.workspaceId,
          userId: existing.id,
          role: party.accessRole === "READER" ? "READER" : party.accessRole === "MODERATOR" ? "MODERATOR" : "PARTICIPANT",
        },
      });
      if (existing.id !== user.id && !previous.has(party.email)) {
        await notifyUser({
          userId: existing.id,
          kind: "INVITE",
          title: "Invitation à une entente",
          body: `${user.name} vous a ajouté à « ${loaded.document.title} ».`,
          href: `/documents/${documentId}`,
        });
        await recordActivity({
          workspaceId: loaded.document.workspaceId,
          documentId,
          actorId: user.id,
          actorName: user.name,
          kind: "INVITE",
          message: `${existing.name} a rejoint « ${loaded.document.title} ».`,
        });
      }
    } else if (party.email && !previous.has(party.email)) {
      await prisma.invitation.create({
        data: {
          email: party.email,
          workspaceId: loaded.document.workspaceId,
          role: party.accessRole === "READER" ? "READER" : "PARTICIPANT",
          documentId,
          invitedById: user.id,
        },
      });
      await recordActivity({
        workspaceId: loaded.document.workspaceId,
        documentId,
        actorId: user.id,
        actorName: user.name,
        kind: "INVITE",
        message: `${user.name} a invité ${party.email}. Le courriel partira lorsque la messagerie sera connectée.`,
      });
    }
  }

  const moderator = moderatorId
    ? await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: loaded.document.workspaceId, userId: moderatorId } },
      })
    : null;
  await prisma.document.update({
    where: { id: documentId },
    data: {
      moderatorId: moderator ? moderatorId : user.id,
      wizardStep: Math.max(loaded.document.wizardStep, 5),
    },
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function addComment(documentId: string, input: { discussionId?: string; sectionId?: string; body: string }) {
  const { user, loaded } = await context(documentId);
  if (!loaded?.access.canComment) return { ok: false as const, error: "Vous ne pouvez pas commenter ce document." };
  const body = input.body.trim();
  if (body.length < 2) return { ok: false as const, error: "Écrivez un commentaire." };

  let discussionId = input.discussionId;
  let sectionTitle = "Discussion";
  if (!discussionId) {
    const section = loaded.document.sections.find((item) => item.id === input.sectionId);
    sectionTitle = section ? section.title : "Discussion générale";
    const discussion = await prisma.discussion.create({
      data: {
        documentId,
        sectionId: section?.id,
        title: section ? `${section.title}` : "Discussion générale",
        status: "OPEN",
      },
    });
    discussionId = discussion.id;
    if (section && section.status !== "LOCKED") {
      await prisma.documentSection.update({
        where: { id: section.id },
        data: { status: "IN_DISCUSSION" },
      });
    }
  } else {
    const existing = loaded.document.discussions.find((item) => item.id === discussionId);
    sectionTitle = existing?.title ?? sectionTitle;
    if (existing?.sectionId) {
      const section = loaded.document.sections.find((item) => item.id === existing.sectionId);
      if (section && section.status !== "LOCKED") {
        await prisma.documentSection.update({ where: { id: section.id }, data: { status: "IN_DISCUSSION" } });
      }
    }
  }

  await prisma.comment.create({
    data: { discussionId, authorId: user.id, authorName: user.name, body },
  });
  await prisma.discussion.update({ where: { id: discussionId }, data: { status: "OPEN" } });
  if (loaded.document.status === "DRAFT") {
    await prisma.document.update({ where: { id: documentId }, data: { status: "IN_DISCUSSION" } });
  }
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: user.name,
    kind: "COMMENT",
    message: `${user.name} a commenté « ${sectionTitle} ».`,
  });
  await notifyOthers(documentId, loaded.document.workspaceId, user.id, {
    kind: "COMMENT",
    title: "Nouveau commentaire",
    body: `${user.name} a écrit dans « ${loaded.document.title} ».`,
    href: `/documents/${documentId}?onglet=discussions`,
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function setDiscussionStatus(documentId: string, discussionId: string, status: "OPEN" | "RESOLVED") {
  const { user, loaded } = await context(documentId);
  if (!loaded?.access.canComment) return { ok: false as const, error: "Action non autorisée." };
  const discussion = loaded.document.discussions.find((item) => item.id === discussionId);
  if (!discussion) return { ok: false as const, error: "Discussion introuvable." };
  await prisma.discussion.update({ where: { id: discussionId }, data: { status } });
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: user.name,
    kind: "COMMENT",
    message:
      status === "RESOLVED"
        ? `${user.name} a marqué « ${discussion.title} » comme résolu.`
        : `${user.name} a rouvert « ${discussion.title} ».`,
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function createProposal(documentId: string, sectionId: string, previousText: string, proposedText: string) {
  const { user, loaded } = await context(documentId);
  if (!loaded?.access.canPropose) return { ok: false as const, error: "Vous ne pouvez pas proposer de modification." };
  const section = loaded.document.sections.find((item) => item.id === sectionId);
  if (!section) return { ok: false as const, error: "Section introuvable." };
  if (section.status === "LOCKED") return { ok: false as const, error: "Cette section est verrouillée." };
  const next = proposedText.trim();
  const previous = previousText.trim();
  if (next.length < 2 || previous.length < 2) return { ok: false as const, error: "Indiquez l'ancienne et la nouvelle formulation." };

  await prisma.proposal.create({
    data: {
      documentId,
      sectionId,
      authorId: user.id,
      authorName: user.name,
      summary: `Modification proposée par ${user.name}`,
      previousText: previous,
      proposedText: next,
    },
  });
  await prisma.documentSection.update({ where: { id: sectionId }, data: { status: "IN_DISCUSSION" } });
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: user.name,
    kind: "PROPOSAL",
    message: `${user.name} a proposé une modification de « ${section.title} ».`,
  });
  await notifyOthers(documentId, loaded.document.workspaceId, user.id, {
    kind: "PROPOSAL",
    title: "Modification proposée",
    body: `${user.name} propose de modifier « ${section.title} ».`,
    href: `/documents/${documentId}?onglet=document`,
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function proposeFormulation(documentId: string, sectionId: string) {
  const { user, loaded } = await context(documentId);
  if (!loaded) return { ok: false as const, error: "Document inaccessible." };
  const section = loaded.document.sections.find((item) => item.id === sectionId);
  if (!section) return { ok: false as const, error: "Section introuvable." };
  if (section.status === "LOCKED") return { ok: false as const, error: "Cette section est verrouillée." };
  const proposed = await suggestFormulation(section.title, section.content);
  const previous = section.content.split("\n").map((line) => line.trim()).filter(Boolean)[0] ?? section.content;
  await prisma.proposal.create({
    data: {
      documentId,
      sectionId,
      authorId: user.id,
      authorName: "Misterdil AI",
      isAi: true,
      summary: "Formulation proposée par Misterdil AI",
      previousText: previous,
      proposedText: proposed,
    },
  });
  if (section.status !== "LOCKED") {
    await prisma.documentSection.update({ where: { id: sectionId }, data: { status: "IN_DISCUSSION" } });
  }
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: "Misterdil AI",
    kind: "AI",
    message: `Misterdil AI a proposé une formulation pour « ${section.title} ».`,
  });
  touchDocument(documentId);
  return { ok: true as const, proposed };
}

export async function resolveProposal(documentId: string, proposalId: string, decision: "ACCEPTED" | "REJECTED" | "MODIFIED" | "DISCUSS", modifiedText?: string) {
  const { user, loaded } = await context(documentId);
  if (!loaded) return { ok: false as const, error: "Document inaccessible." };
  const proposal = loaded.document.proposals.find((item) => item.id === proposalId);
  if (!proposal) return { ok: false as const, error: "Proposition introuvable." };
  if (proposal.status !== "PENDING") return { ok: false as const, error: "Cette proposition est déjà traitée." };

  if (decision === "DISCUSS") {
    if (!loaded.access.canComment) return { ok: false as const, error: "Discussion non autorisée." };
    const discussion = await prisma.discussion.create({
      data: {
        documentId,
        sectionId: proposal.sectionId,
        title: proposal.section.title,
        status: "OPEN",
        comments: {
          create: {
            authorId: user.id,
            authorName: user.name,
            body: `Discussion ouverte sur la proposition de ${proposal.authorName} : « ${proposal.proposedText} ».`,
          },
        },
      },
    });
    void discussion;
    touchDocument(documentId);
    return { ok: true as const };
  }

  if (!loaded.access.canValidate) return { ok: false as const, error: "Seul le modérateur peut accepter ou refuser." };

  if (decision === "REJECTED") {
    await prisma.proposal.update({ where: { id: proposalId }, data: { status: "REJECTED", resolvedAt: new Date() } });
    await recordActivity({
      workspaceId: loaded.document.workspaceId,
      documentId,
      actorId: user.id,
      actorName: user.name,
      kind: "PROPOSAL",
      message: `${user.name} a refusé la proposition de ${proposal.authorName} sur « ${proposal.section.title} ».`,
    });
    touchDocument(documentId);
    return { ok: true as const };
  }

  const replacement = decision === "MODIFIED" ? (modifiedText ?? "").trim() : proposal.proposedText;
  if (replacement.length < 2) return { ok: false as const, error: "La formulation est vide." };
  const section = loaded.document.sections.find((item) => item.id === proposal.sectionId);
  if (!section) return { ok: false as const, error: "Section introuvable." };
  if (section.status === "LOCKED") return { ok: false as const, error: "Cette section est verrouillée." };

  const content = section.content.includes(proposal.previousText)
    ? section.content.replace(proposal.previousText, replacement)
    : `${section.content}\n\n${replacement}`;

  await prisma.documentSection.update({
    where: { id: section.id },
    data: { content, status: "IN_PREPARATION" },
  });
  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: decision === "MODIFIED" ? "MODIFIED" : "ACCEPTED", proposedText: replacement, resolvedAt: new Date() },
  });
  await saveVersion({
    documentId,
    label: `Proposition acceptée — ${section.title}`,
    createdByName: user.name,
    sections: loaded.document.sections.map((item) => ({
      anchor: item.anchor,
      title: item.title,
      content: item.id === section.id ? content : item.content,
      status: item.id === section.id ? "IN_PREPARATION" : item.status,
      position: item.position,
    })),
  });
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: user.name,
    kind: "PROPOSAL",
    message: `${user.name} a ${decision === "MODIFIED" ? "modifié puis accepté" : "accepté"} la proposition sur « ${section.title} ».`,
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function requestValidation(documentId: string) {
  const { user, loaded } = await context(documentId);
  if (!loaded?.access.canValidate) return { ok: false as const, error: "Seul le modérateur peut demander la validation." };
  const ready = loaded.document.sections.length > 0 && loaded.document.sections.every((section) => section.status === "VALIDATED" || section.status === "LOCKED");
  if (!ready) return { ok: false as const, error: "Toutes les sections nécessaires doivent être validées." };

  await prisma.approval.deleteMany({ where: { documentId, sectionId: null } });
  const stakeholders = loaded.document.stakeholders.filter((item) => item.userId);
  await prisma.approval.createMany({
    data: stakeholders.map((item) => ({
      documentId,
      userId: item.userId as string,
      roleLabel: partyLabel(item.partyType),
      status: "PENDING",
    })),
  });
  await prisma.document.update({ where: { id: documentId }, data: { status: "PENDING_VALIDATION" } });
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: user.name,
    kind: "VALIDATE",
    message: `${user.name} a demandé la validation finale.`,
  });
  await notifyOthers(documentId, loaded.document.workspaceId, user.id, {
    kind: "VALIDATION",
    title: "Validation demandée",
    body: `« ${loaded.document.title} » est prêt pour votre validation.`,
    href: `/documents/${documentId}?onglet=validation`,
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function approveParticipation(documentId: string) {
  const { user, loaded } = await context(documentId);
  if (!loaded) return { ok: false as const, error: "Document inaccessible." };
  const approval = loaded.document.approvals.find((item) => !item.sectionId && item.userId === user.id);
  if (!approval) return { ok: false as const, error: "Aucune validation ne vous est demandée." };
  await prisma.approval.update({
    where: { id: approval.id },
    data: { status: "APPROVED", decidedAt: new Date() },
  });
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: user.name,
    kind: "VALIDATE",
    message: `${user.name} a validé sa participation.`,
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function sendForSignature(documentId: string) {
  const { user, loaded } = await context(documentId);
  if (!loaded?.access.canValidate) return { ok: false as const, error: "Seul le modérateur peut envoyer en signature." };
  const ready = loaded.document.sections.every((section) => section.status === "VALIDATED" || section.status === "LOCKED");
  const approvals = loaded.document.approvals.filter((item) => !item.sectionId);
  if (!ready || approvals.length === 0 || approvals.some((item) => item.status !== "APPROVED")) {
    return { ok: false as const, error: "Toutes les parties doivent avoir validé le document." };
  }
  if (loaded.document.signatures.length === 0) {
    for (const stakeholder of loaded.document.stakeholders) {
      const provider = await internalSignatureProvider.requestSignature({
        documentId,
        stakeholderId: stakeholder.id,
        signerName: stakeholder.representative || stakeholder.name,
        signerEmail: stakeholder.email,
      });
      await prisma.signature.create({
        data: {
          documentId,
          stakeholderId: stakeholder.id,
          status: "REQUIRED",
          method: provider.method,
          providerRef: provider.providerRef,
        },
      });
    }
  }
  await prisma.document.update({ where: { id: documentId }, data: { status: "PENDING_SIGNATURE" } });
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: user.name,
    kind: "SIGN",
    message: `${user.name} a envoyé « ${loaded.document.title} » pour signature.`,
  });
  await notifyOthers(documentId, loaded.document.workspaceId, user.id, {
    kind: "SIGNATURE",
    title: "Signature demandée",
    body: `Votre signature est requise sur « ${loaded.document.title} ».`,
    href: `/documents/${documentId}?onglet=signature`,
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function signDocument(documentId: string, signatureId: string) {
  const { user, loaded } = await context(documentId);
  if (!loaded) return { ok: false as const, error: "Document inaccessible." };
  const signature = loaded.document.signatures.find((item) => item.id === signatureId);
  if (!signature) return { ok: false as const, error: "Signature introuvable." };
  const owns = signature.stakeholder.userId === user.id || signature.stakeholder.email.toLowerCase() === user.email.toLowerCase();
  if (!owns) return { ok: false as const, error: "Cette signature ne vous est pas destinée." };
  if (signature.status === "SIGNED") return { ok: true as const };

  await prisma.signature.update({
    where: { id: signatureId },
    data: {
      status: "SIGNED",
      signerName: user.name,
      signerEmail: user.email,
      signedAt: new Date(),
      method: "INTERNAL",
    },
  });
  const pending = loaded.document.signatures.filter((item) => item.id !== signatureId && item.status !== "SIGNED");
  if (pending.length === 0) {
    await prisma.document.update({ where: { id: documentId }, data: { status: "FINAL" } });
    await notifyOthers(documentId, loaded.document.workspaceId, user.id, {
      kind: "FINAL",
      title: "Document finalisé",
      body: `« ${loaded.document.title} » est signé par toutes les parties.`,
      href: `/documents/${documentId}`,
    });
  }
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: user.name,
    kind: "SIGN",
    message: `${user.name} a signé « ${loaded.document.title} ».`,
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function setModerator(documentId: string, moderatorId: string) {
  const { user, loaded } = await context(documentId);
  if (!loaded?.access.canInvite) return { ok: false as const, error: "Vous ne pouvez pas désigner le modérateur." };
  const member = loaded.document.workspace.members.find((item) => item.userId === moderatorId);
  if (!member) return { ok: false as const, error: "Cette personne n'appartient pas à l'espace." };
  await prisma.document.update({ where: { id: documentId }, data: { moderatorId } });
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: user.name,
    kind: "EDIT",
    message: `${user.name} a désigné ${member.user.name} comme modérateur.`,
  });
  touchDocument(documentId);
  return { ok: true as const };
}
