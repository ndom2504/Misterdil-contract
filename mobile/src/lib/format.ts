export const SECTION_STATUS: Record<string, string> = {
  NOT_STARTED: 'Non commencé',
  IN_PREPARATION: 'En préparation',
  IN_DISCUSSION: 'En discussion',
  CHANGES_REQUESTED: 'Modification demandée',
  VALIDATED: 'Validé',
  LOCKED: 'Verrouillé',
};

export const DOCUMENT_STATUS: Record<string, string> = {
  DRAFT: 'Brouillon',
  IN_DISCUSSION: 'En discussion',
  PENDING_VALIDATION: 'En validation',
  PENDING_SIGNATURE: 'À signer',
  FINAL: 'Finalisé',
};

const ROLES: Record<string, string> = {
  ADMINISTRATOR: 'Administrateur',
  CREATOR: 'Créateur',
  MODERATOR: 'Modérateur',
  PARTICIPANT: 'Participant',
  READER: 'Lecteur',
};

const PARTY_TYPES: Record<string, string> = {
  CLIENT: 'Client',
  PROVIDER: 'Prestataire',
  SUPPLIER: 'Fournisseur',
  SUBCONTRACTOR: 'Sous-traitant',
  PARTNER: 'Partenaire',
  CONSULTANT: 'Consultant',
  ORGANIZATION: 'Organisme',
  OTHER: 'Autre',
};

export function roleLabel(id: string) {
  return ROLES[id] ?? id;
}

export function partyLabel(id: string) {
  return PARTY_TYPES[id] ?? id;
}

export function formatRelative(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(value).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

const PALETTE = ['#2f6fed', '#0f9d7a', '#c2410c', '#7c3aed', '#be185d', '#0369a1', '#4d7c0f', '#b45309'];

export function colorFor(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

// Notifications carry web paths; the app only has a screen for documents.
export function appRoute(href: string) {
  const match = /^\/documents\/([^/?#]+)/.exec(href);
  if (match && match[1] !== 'nouveau') return `/documents/${match[1]}`;
  return '/';
}
