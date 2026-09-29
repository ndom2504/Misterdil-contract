import { documentTypeById, type BlueprintSection, type FieldDef } from "@/lib/catalog";
import { partyLabel } from "@/lib/domain";

export type RenderParty = {
  name: string;
  organization: string;
  partyType: string;
  email: string;
  phone: string;
  representative: string;
  jobTitle: string;
  address: string;
};

function partyBlock(party: RenderParty) {
  const org = party.organization || party.name;
  const person = party.representative || party.name;
  const lines = [
    `${org}, représentée par ${person}${party.jobTitle ? `, ${party.jobTitle}` : ""}, en qualité de ${partyLabel(party.partyType).toLowerCase()}.`,
  ];
  if (party.email) lines.push(`Courriel : ${party.email}`);
  if (party.phone) lines.push(`Téléphone : ${party.phone}`);
  if (party.address) lines.push(`Adresse : ${party.address}`);
  return lines.join("\n");
}

export function renderParties(parties: RenderParty[]) {
  return parties.map(partyBlock).join("\n\n");
}

function relatedValue(fields: FieldDef[], responses: Record<string, string>, anchor: string) {
  return fields
    .filter((item) => item.anchor === anchor)
    .map((item) => {
      const value = responses[item.key]?.trim();
      if (!value) return "";
      return `${item.label}\n${value}`;
    })
    .filter(Boolean);
}

export function renderDocument(input: {
  typeId: string;
  title: string;
  sectorLabel: string;
  domain: string;
  description: string;
  responses: Record<string, string>;
  fields: FieldDef[];
  parties: RenderParty[];
  blueprint?: BlueprintSection[];
}) {
  const type = documentTypeById(input.typeId);
  const blueprint = input.blueprint ?? type?.blueprint ?? [];
  if (!blueprint.length) return [];

  return blueprint.map((section) => {
    const parts: string[] = [section.intro];

    if (section.anchor === "parties") {
      parts.push(
        input.parties.length
          ? input.parties.map(partyBlock).join("\n\n")
          : "Les parties seront identifiées avant la validation.",
      );
    }

    if (section.anchor === "definitions" && input.typeId === "contrat") {
      parts.push(
        "« Client » désigne la partie identifiée comme telle.\n« Prestataire » désigne la partie chargée d'exécuter la mission.\n« Livrable » désigne tout élément remis au titre du contrat.\n« Jour » désigne un jour calendaire, sauf mention contraire.",
      );
    }

    if (section.anchor === "objet" && input.description.trim()) {
      parts.push(`Contexte exprimé par les parties\n${input.description.trim()}`);
    }

    if (input.domain && (section.anchor === "objet" || section.anchor === "contexte")) {
      parts.push(`Secteur et domaine\n${input.sectorLabel || "Non précisé"}${input.domain ? ` — ${input.domain}` : ""}`);
    }

    parts.push(...relatedValue(input.fields, input.responses, section.anchor));

    if (parts.length === 1) {
      parts.push("Cette section sera complétée par le modérateur à partir des informations confirmées par les parties.");
    }

    return {
      anchor: section.anchor,
      title: section.title,
      content: parts.join("\n\n"),
    };
  });
}

export function suggestedTitle(typeId: string, domain: string) {
  const type = documentTypeById(typeId);
  const label = type?.label ?? "Entente";
  return domain ? `${label} — ${domain}` : label;
}
