export const SECTION_STATUS = {
  NOT_STARTED: "Non commencé",
  IN_PREPARATION: "En préparation",
  IN_DISCUSSION: "En discussion",
  CHANGES_REQUESTED: "Modification demandée",
  VALIDATED: "Validé",
  LOCKED: "Verrouillé",
} as const;

export const DOCUMENT_STATUS = {
  DRAFT: "Brouillon",
  IN_DISCUSSION: "En discussion",
  PENDING_VALIDATION: "En validation",
  PENDING_SIGNATURE: "À signer",
  FINAL: "Finalisé",
} as const;

export type SectionStatus = keyof typeof SECTION_STATUS;
export type DocumentStatus = keyof typeof DOCUMENT_STATUS;

export const PARTY_TYPES = [
  { id: "CLIENT", label: "Client" },
  { id: "PROVIDER", label: "Prestataire" },
  { id: "SUPPLIER", label: "Fournisseur" },
  { id: "SUBCONTRACTOR", label: "Sous-traitant" },
  { id: "PARTNER", label: "Partenaire" },
  { id: "CONSULTANT", label: "Consultant" },
  { id: "ORGANIZATION", label: "Organisme" },
  { id: "OTHER", label: "Autre" },
] as const;

export const ACCESS_ROLES = [
  { id: "MODERATOR", label: "Modérateur" },
  { id: "PARTICIPANT", label: "Participant" },
  { id: "READER", label: "Lecteur" },
] as const;

export const WORKSPACE_ROLES = [
  { id: "ADMINISTRATOR", label: "Administrateur", description: "Accès complet à l'organisation et à ses espaces." },
  { id: "CREATOR", label: "Créateur", description: "Crée et gère ses espaces." },
  { id: "MODERATOR", label: "Modérateur", description: "Gère le contenu, les validations et le workflow." },
  { id: "PARTICIPANT", label: "Participant", description: "Consulte, commente et propose des modifications." },
  { id: "READER", label: "Lecteur", description: "Consultation seule." },
] as const;

export const PROFILE_TYPES = [
  "Dirigeant",
  "Juriste",
  "Chef de projet",
  "Consultant",
  "Professionnel",
  "Autre",
] as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMINISTRATOR: [
    "workspace.manage",
    "document.create",
    "document.edit",
    "document.comment",
    "document.propose",
    "document.validate",
    "document.lock",
    "document.invite",
    "document.sign",
    "document.read",
  ],
  CREATOR: [
    "workspace.manage",
    "document.create",
    "document.edit",
    "document.comment",
    "document.propose",
    "document.validate",
    "document.lock",
    "document.invite",
    "document.sign",
    "document.read",
  ],
  MODERATOR: [
    "document.create",
    "document.edit",
    "document.comment",
    "document.propose",
    "document.validate",
    "document.lock",
    "document.invite",
    "document.sign",
    "document.read",
  ],
  PARTICIPANT: ["document.comment", "document.propose", "document.sign", "document.read"],
  READER: ["document.read"],
};

export function partyLabel(id: string) {
  return PARTY_TYPES.find((item) => item.id === id)?.label ?? id;
}

export function roleLabel(id: string) {
  return WORKSPACE_ROLES.find((item) => item.id === id)?.label ?? ACCESS_ROLES.find((item) => item.id === id)?.label ?? id;
}

export function sectionStatusLabel(status: string) {
  return SECTION_STATUS[status as SectionStatus] ?? status;
}

export function documentStatusLabel(status: string) {
  return DOCUMENT_STATUS[status as DocumentStatus] ?? status;
}
