"use server";

import { documentTypeById, fieldVisible, sectorById, type BlueprintSection, type FieldDef } from "@/lib/catalog";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/current-user";
import { renderDocument, renderParties, suggestedTitle } from "@/server/document-render";
import { loadDocumentForUser } from "@/server/guard";
import { recordActivity, saveVersion, touchDocument } from "@/server/journal";
import { cleanParties, replaceStakeholders, type PartyInput } from "@/server/sharing";

async function editable(documentId: string) {
  const user = await requireUser();
  const loaded = await loadDocumentForUser(documentId, user);
  if (!loaded) return { user, loaded: null };
  return { user, loaded };
}

export async function loadFields(typeId: string, sector: string) {
  await requireUser();
  const template = await prisma.formTemplate.findFirst({
    where: { typeId },
    include: { fields: { orderBy: { position: "asc" } } },
  });

  if (!template) {
    const { fieldsFor } = await import("@/lib/catalog");
    return fieldsFor(typeId, sector);
  }

  return template.fields
    .filter((item) =>
      fieldVisible(
        {
          key: item.key,
          label: item.label,
          help: item.help,
          fieldType: item.fieldType as FieldDef["fieldType"],
          required: item.required,
          group: item.groupLabel,
          anchor: item.sectionAnchor,
          options: [],
          sectors: item.sectors ? item.sectors.split(",").filter(Boolean) : [],
          excludedSectors: item.excludedSectors ? item.excludedSectors.split(",").filter(Boolean) : [],
        },
        sector,
      ),
    )
    .map((item): FieldDef => ({
      key: item.key,
      label: item.label,
      help: item.help,
      fieldType: item.fieldType as FieldDef["fieldType"],
      required: item.required,
      group: item.groupLabel,
      anchor: item.sectionAnchor,
      options: item.optionsJson ? (JSON.parse(item.optionsJson) as string[]) : [],
      sectors: [],
      excludedSectors: [],
    }));
}

export async function createDraft(workspaceId: string, typeId: string) {
  const user = await requireUser();
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (!membership || !["ADMINISTRATOR", "CREATOR", "MODERATOR"].includes(membership.role)) {
    return { ok: false as const, error: "Vous ne pouvez pas créer de document dans cet espace." };
  }
  const type = await prisma.documentType.findUnique({ where: { id: typeId } });
  const fallback = documentTypeById(typeId);
  if (!type && !fallback) return { ok: false as const, error: "Type de document inconnu." };

  const document = await prisma.document.create({
    data: {
      workspaceId,
      typeId,
      title: type?.label ?? fallback?.label ?? "Entente",
      createdById: user.id,
      moderatorId: user.id,
      status: "DRAFT",
      wizardStep: 2,
    },
  });
  await recordActivity({
    workspaceId,
    documentId: document.id,
    actorId: user.id,
    actorName: user.name,
    kind: "CREATE",
    message: `${user.name} a créé « ${document.title} ».`,
  });
  touchDocument(document.id);
  return { ok: true as const, id: document.id };
}

// New flow: the team is chosen first, then the type. The document starts with the
// type's sections, all empty except the parties, ready to be written together.
export async function createAgreement(input: { workspaceId: string; typeId: string; title: string; parties: PartyInput[] }) {
  const user = await requireUser();
  if (!user.organization) return { ok: false as const, error: "Complétez d'abord votre profil." };
  const parties = cleanParties(input.parties);
  if (!parties.length) return { ok: false as const, error: "Ajoutez au moins une partie." };
  const type = await prisma.documentType.findUnique({ where: { id: input.typeId } });
  const fallback = documentTypeById(input.typeId);
  if (!type && !fallback) return { ok: false as const, error: "Type d'entente inconnu." };
  const blueprint: BlueprintSection[] = type ? (JSON.parse(type.blueprint) as BlueprintSection[]) : fallback?.blueprint ?? [];
  if (!blueprint.length) return { ok: false as const, error: "Aucune structure n'est disponible pour ce type." };

  let workspaceId = input.workspaceId;
  if (workspaceId) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });
    if (!membership || !["ADMINISTRATOR", "CREATOR", "MODERATOR"].includes(membership.role)) {
      return { ok: false as const, error: "Vous ne pouvez pas créer d'entente dans cet espace." };
    }
  } else {
    const workspace = await prisma.workspace.create({
      data: {
        organizationId: user.organization.id,
        name: user.organization.kind === "INDIVIDUAL" ? "Mes ententes" : `Ententes ${user.organization.name}`,
        createdById: user.id,
        members: { create: { userId: user.id, role: "CREATOR" } },
      },
    });
    workspaceId = workspace.id;
  }

  const title = input.title.trim() || type?.label || fallback?.label || "Entente";
  const document = await prisma.document.create({
    data: {
      workspaceId,
      typeId: input.typeId,
      title,
      createdById: user.id,
      moderatorId: user.id,
      status: "DRAFT",
      wizardStep: 6,
    },
  });
  const partiesText = renderParties(parties);
  const sections = blueprint.map((section, index) => ({
    documentId: document.id,
    anchor: section.anchor,
    title: section.title,
    content: section.anchor === "parties" ? partiesText : "",
    status: section.anchor === "parties" ? "IN_PREPARATION" : "NOT_STARTED",
    position: index + 1,
    updatedById: user.id,
    updatedByName: user.name,
  }));
  try {
    await replaceStakeholders(document.id, parties);
    await prisma.documentSection.createMany({ data: sections });
  } catch (error) {
    await prisma.document.delete({ where: { id: document.id } }).catch(() => {});
    throw error;
  }
  await saveVersion({
    documentId: document.id,
    label: "Structure initiale",
    createdByName: user.name,
    sections: sections.map(({ anchor, title: sectionTitle, content, status, position }) => ({ anchor, title: sectionTitle, content, status, position })),
  });
  await recordActivity({
    workspaceId,
    documentId: document.id,
    actorId: user.id,
    actorName: user.name,
    kind: "CREATE",
    message: `${user.name} a créé « ${title} » avec ${parties.length} partie${parties.length > 1 ? "s" : ""}.`,
  });
  touchDocument(document.id);
  return { ok: true as const, id: document.id };
}

export async function saveContext(documentId: string, sector: string, domain: string) {
  const { user, loaded } = await editable(documentId);
  if (!loaded?.access.canEdit) return { ok: false as const, error: "Modification non autorisée." };
  await prisma.document.update({
    where: { id: documentId },
    data: { sector, domain, wizardStep: Math.max(loaded.document.wizardStep, 3) },
  });
  touchDocument(documentId);
  return { ok: true as const, user: user.name };
}

export async function saveDescription(documentId: string, description: string) {
  const { loaded } = await editable(documentId);
  if (!loaded?.access.canEdit) return { ok: false as const, error: "Modification non autorisée." };
  await prisma.document.update({
    where: { id: documentId },
    data: { description: description.trim() },
  });
  return { ok: true as const };
}

export async function confirmBrief(documentId: string, brief: { objectif: string; client: string; prestataire: string; duree: string }) {
  const { loaded } = await editable(documentId);
  if (!loaded?.access.canEdit) return { ok: false as const, error: "Modification non autorisée." };
  await prisma.document.update({
    where: { id: documentId },
    data: {
      briefJson: JSON.stringify(brief),
      briefConfirmed: true,
      wizardStep: Math.max(loaded.document.wizardStep, 4),
    },
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function saveResponse(documentId: string, key: string, value: string) {
  const { loaded } = await editable(documentId);
  if (!loaded?.access.canEdit) return { ok: false as const, error: "Modification non autorisée." };
  await prisma.formResponse.upsert({
    where: { documentId_fieldKey: { documentId, fieldKey: key } },
    update: { value },
    create: { documentId, fieldKey: key, value },
  });
  if (loaded.document.wizardStep < 5) {
    await prisma.document.update({ where: { id: documentId }, data: { wizardStep: 5 } });
  }
  return { ok: true as const };
}

export async function saveResponses(documentId: string, responses: Record<string, string>) {
  const { loaded } = await editable(documentId);
  if (!loaded?.access.canEdit) return { ok: false as const, error: "Modification non autorisée." };
  const entries = Object.entries(responses).filter(([, value]) => value.trim().length > 0);
  await prisma.$transaction(
    entries.map(([fieldKey, value]) =>
      prisma.formResponse.upsert({
        where: { documentId_fieldKey: { documentId, fieldKey } },
        update: { value },
        create: { documentId, fieldKey, value },
      }),
    ),
  );
  if (entries.length && loaded.document.wizardStep < 5) {
    await prisma.document.update({ where: { id: documentId }, data: { wizardStep: 5 } });
  }
  touchDocument(documentId);
  return { ok: true as const };
}

export async function saveTitle(documentId: string, title: string) {
  const { loaded } = await editable(documentId);
  if (!loaded?.access.canEdit) return { ok: false as const, error: "Modification non autorisée." };
  const next = title.trim();
  if (next.length < 3) return { ok: false as const, error: "Le titre est trop court." };
  await prisma.document.update({ where: { id: documentId }, data: { title: next } });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function generateDocument(documentId: string, title: string) {
  const { user, loaded } = await editable(documentId);
  if (!loaded?.access.canEdit) return { ok: false as const, error: "Modification non autorisée." };
  if (loaded.document.sections.some((section) => section.status === "VALIDATED" || section.status === "LOCKED")) {
    return { ok: false as const, error: "Des sections sont déjà validées. Poursuivez dans l'éditeur." };
  }

  const responses = Object.fromEntries(loaded.document.responses.map((item) => [item.fieldKey, item.value]));
  const fields = await loadFields(loaded.document.typeId, loaded.document.sector);
  const typeRow = await prisma.documentType.findUnique({ where: { id: loaded.document.typeId } });
  const blueprint = typeRow ? (JSON.parse(typeRow.blueprint) as BlueprintSection[]) : undefined;
  const sectorLabel = sectorById(loaded.document.sector)?.label ?? loaded.document.sector;
  const sections = renderDocument({
    typeId: loaded.document.typeId,
    title,
    sectorLabel,
    domain: loaded.document.domain,
    description: loaded.document.description,
    responses,
    fields,
    blueprint,
    parties: loaded.document.stakeholders.map((party) => ({
      name: party.name,
      organization: party.organization,
      partyType: party.partyType,
      email: party.email,
      phone: party.phone,
      representative: party.representative,
      jobTitle: party.jobTitle,
      address: party.address,
    })),
  });

  if (!sections.length) return { ok: false as const, error: "Aucune structure n'est disponible pour ce type." };

  const finalTitle = title.trim() || suggestedTitle(loaded.document.typeId, loaded.document.domain);
  await prisma.documentSection.deleteMany({ where: { documentId } });
  await prisma.documentSection.createMany({
    data: sections.map((section, index) => ({
      documentId,
      anchor: section.anchor,
      title: section.title,
      content: section.content,
      status: "IN_PREPARATION",
      position: index + 1,
      updatedById: user.id,
      updatedByName: "Misterdil AI",
    })),
  });
  await prisma.document.update({
    where: { id: documentId },
    data: { title: finalTitle, status: loaded.document.sentAt ? "IN_DISCUSSION" : "DRAFT", wizardStep: 6 },
  });
  await saveVersion({
    documentId,
    label: "Version initiale",
    createdByName: "Misterdil AI",
    sections: sections.map((section, index) => ({
      anchor: section.anchor,
      title: section.title,
      content: section.content,
      status: "IN_PREPARATION",
      position: index + 1,
    })),
  });
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: "Misterdil AI",
    kind: "AI",
    message: `Misterdil AI a généré la première version de « ${finalTitle} ». ${user.name} reste décisionnaire.`,
  });
  touchDocument(documentId);
  return { ok: true as const };
}

export async function updateSectionContent(
  documentId: string,
  sectionId: string,
  content: string,
  log: boolean,
  expectedUpdatedAt?: string,
) {
  const { user, loaded } = await editable(documentId);
  if (!loaded?.access.canWrite) return { ok: false as const, error: "Votre accès est en lecture seule." };
  const section = loaded.document.sections.find((item) => item.id === sectionId);
  if (!section) return { ok: false as const, error: "Section introuvable." };
  if (section.status === "LOCKED") return { ok: false as const, error: "Cette section est verrouillée." };
  if (section.content === content) return { ok: true as const, updatedAt: section.updatedAt.toISOString() };

  // Another participant saved this section since the editor loaded it: refuse to overwrite.
  if (
    expectedUpdatedAt &&
    section.updatedById &&
    section.updatedById !== user.id &&
    section.updatedAt.getTime() > new Date(expectedUpdatedAt).getTime()
  ) {
    return {
      ok: false as const,
      conflict: true as const,
      error: `${section.updatedByName || "Un participant"} vient de modifier cette section.`,
      content: section.content,
      updatedAt: section.updatedAt.toISOString(),
    };
  }

  const saved = await prisma.documentSection.update({
    where: { id: sectionId },
    data: {
      content,
      updatedById: user.id,
      updatedByName: user.name,
      status: section.status === "NOT_STARTED" && content.trim() ? "IN_PREPARATION" : section.status,
    },
  });
  await prisma.document.update({ where: { id: documentId }, data: { updatedAt: new Date() } });
  if (log) {
    await saveVersion({
      documentId,
      label: `Modification — ${section.title}`,
      createdByName: user.name,
      sections: loaded.document.sections.map((item) => ({
        anchor: item.anchor,
        title: item.title,
        content: item.id === sectionId ? content : item.content,
        status: item.status,
        position: item.position,
      })),
    });
    await recordActivity({
      workspaceId: loaded.document.workspaceId,
      documentId,
      actorId: user.id,
      actorName: user.name,
      kind: "EDIT",
      message: `${user.name} a modifié l'article « ${section.title} ».`,
    });
    touchDocument(documentId);
  }
  return { ok: true as const, updatedAt: saved.updatedAt.toISOString() };
}

export async function setSectionStatus(documentId: string, sectionId: string, status: string) {
  const { user, loaded } = await editable(documentId);
  if (!loaded?.access.canValidate) return { ok: false as const, error: "Vous ne pouvez pas changer ce statut." };
  const allowed = ["NOT_STARTED", "IN_PREPARATION", "IN_DISCUSSION", "CHANGES_REQUESTED", "VALIDATED", "LOCKED"];
  if (!allowed.includes(status)) return { ok: false as const, error: "Statut inconnu." };
  if (status === "LOCKED" && !loaded.access.canLock) return { ok: false as const, error: "Verrouillage non autorisé." };

  const section = loaded.document.sections.find((item) => item.id === sectionId);
  if (!section) return { ok: false as const, error: "Section introuvable." };
  await prisma.documentSection.update({ where: { id: sectionId }, data: { status } });
  await recordActivity({
    workspaceId: loaded.document.workspaceId,
    documentId,
    actorId: user.id,
    actorName: user.name,
    kind: status === "VALIDATED" ? "VALIDATE" : "EDIT",
    message:
      status === "VALIDATED"
        ? `${user.name} a validé « ${section.title} ».`
        : status === "LOCKED"
          ? `${user.name} a verrouillé « ${section.title} ».`
          : `${user.name} a mis « ${section.title} » à jour.`,
  });
  touchDocument(documentId);
  return { ok: true as const };
}
