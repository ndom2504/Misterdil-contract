export type FieldType = "text" | "textarea" | "number" | "date" | "select";

export type FieldDef = {
  key: string;
  label: string;
  help: string;
  fieldType: FieldType;
  required: boolean;
  group: string;
  anchor: string;
  options: string[];
  sectors: string[];
  excludedSectors: string[];
};

export type BlueprintSection = {
  anchor: string;
  title: string;
  intro: string;
};

export type DocumentTypeDef = {
  id: string;
  label: string;
  description: string;
  position: number;
  blueprint: BlueprintSection[];
  fields: FieldDef[];
};

export type SectorDef = {
  id: string;
  label: string;
  domains: string[];
};

function field(
  key: string,
  label: string,
  anchor: string,
  group: string,
  extra: Partial<FieldDef> = {},
): FieldDef {
  return {
    key,
    label,
    help: "",
    fieldType: "textarea",
    required: false,
    group,
    anchor,
    options: [],
    sectors: [],
    excludedSectors: [],
    ...extra,
  };
}

const text = (extra: Partial<FieldDef> = {}) => ({ fieldType: "text" as const, ...extra });
const date = (extra: Partial<FieldDef> = {}) => ({ fieldType: "date" as const, ...extra });

export const SECTORS: SectorDef[] = [
  { id: "construction", label: "Construction", domains: ["Bâtiment", "Génie civil", "Infrastructure", "Rénovation", "Travaux publics", "Architecture", "Ingénierie"] },
  { id: "technologie", label: "Technologie", domains: ["Logiciel", "Produit numérique", "Cybersécurité", "Données", "Objets connectés"] },
  { id: "informatique", label: "Informatique", domains: ["Développement applicatif", "Infrastructure", "Cybersécurité", "Données", "Infogérance", "Intégration"] },
  { id: "transport", label: "Transport", domains: ["Transport routier", "Logistique urbaine", "Mobilité", "Entretien de flotte"] },
  { id: "sante", label: "Santé", domains: ["Clinique", "Soins à domicile", "Imagerie", "Systèmes d'information santé"] },
  { id: "education", label: "Éducation", domains: ["Formation", "Établissement", "Contenu pédagogique", "Recherche"] },
  { id: "finance", label: "Finance", domains: ["Services financiers", "Assurance", "Comptabilité", "Conseil"] },
  { id: "commerce", label: "Commerce", domains: ["Détail", "Distribution", "Commerce électronique"] },
  { id: "industrie", label: "Industrie", domains: ["Fabrication", "Maintenance industrielle", "Qualité"] },
  { id: "administration", label: "Administration publique", domains: ["Services aux citoyens", "Marchés publics", "Transformation numérique"] },
  { id: "services", label: "Services professionnels", domains: ["Conseil", "Juridique", "Expertise", "Accompagnement"] },
  { id: "immobilier", label: "Immobilier", domains: ["Gestion immobilière", "Promotion", "Location"] },
  { id: "logistique", label: "Logistique", domains: ["Entreposage", "Distribution", "Chaîne d'approvisionnement"] },
  { id: "autre", label: "Autre", domains: ["Général"] },
];

export const EXTRA_DOMAINS: Record<string, string[]> = {
  construction: ["Performance énergétique", "Aménagement urbain"],
  technologie: ["Intelligence artificielle", "Plateformes cloud"],
  informatique: ["Applications mobiles", "Intelligence artificielle", "Cloud"],
  transport: ["Transport adapté", "Infrastructures de recharge"],
  sante: ["Télémédecine", "Protection des renseignements"],
  education: ["Formation en ligne", "Parcours professionnels"],
  finance: ["Conformité", "Paiements"],
  commerce: ["Expérience client", "Approvisionnement"],
  industrie: ["Automatisation", "Santé-sécurité"],
  administration: ["Données ouvertes", "Services numériques"],
  services: ["Mandat professionnel", "Sous-traitance intellectuelle"],
  immobilier: ["Copropriété", "Exploitation"],
  logistique: ["Dernier kilomètre", "Traçabilité"],
  autre: ["Projet transversal"],
};

const protections = [
  field("confidentialite", "Confidentialité", "confidentialite", "Protections", {
    help: "Informations à protéger et durée de l'obligation.",
  }),
  field("propriete", "Propriété intellectuelle", "propriete", "Protections", {
    help: "Qui détient les droits sur les livrables et les éléments préexistants.",
    sectors: ["informatique", "technologie", "services", "education", "sante"],
  }),
  field("donnees_sensibles", "Données sensibles ou réglementées", "confidentialite", "Protections", {
    sectors: ["sante", "administration", "finance"],
    help: "Exigences particulières de protection, d'hébergement ou de conservation.",
  }),
  field("resiliation", "Résiliation", "resiliation", "Protections"),
  field("droit", "Droit applicable", "resiliation", "Protections", text({ help: "Par exemple : droit du Québec." })),
  field("differends", "Règlement des différends", "resiliation", "Protections"),
];

const contractFields: FieldDef[] = [
  field("objet", "Objet", "objet", "Mission", { required: true, help: "Ce que les parties veulent accomplir." }),
  field("portee", "Portée", "portee", "Mission", { required: true }),
  field("hors_perimetre", "Hors portée", "portee", "Mission"),
  field("livrables", "Livrables", "livrables", "Mission", { required: true }),
  field("lieu", "Lieu d'exécution", "portee", "Mission", text({ sectors: ["construction", "immobilier", "industrie", "logistique"] })),
  field("duree", "Durée", "calendrier", "Cadre", text({ required: true, help: "Par exemple : 12 mois." })),
  field("date_debut", "Date de début", "calendrier", "Cadre", date()),
  field("calendrier", "Calendrier et jalons", "calendrier", "Cadre"),
  field("budget", "Budget", "financier", "Conditions", text({ required: true })),
  field("paiement", "Modalités de paiement", "financier", "Conditions", { required: true }),
  field("penalites", "Pénalités ou retenues", "financier", "Conditions", { sectors: ["construction", "fourniture", "logistique", "transport"] }),
  field("obligations_prestataire", "Obligations du prestataire", "obligations", "Engagements"),
  field("obligations_client", "Obligations du client", "obligations", "Engagements"),
  field("assurances", "Assurances", "obligations", "Engagements", { sectors: ["construction", "transport", "industrie", "immobilier"] }),
  field("normes", "Normes et exigences applicables", "obligations", "Engagements", { sectors: ["construction", "sante", "industrie", "administration"] }),
  field("maintenance", "Maintenance", "portee", "Engagements", { sectors: ["informatique", "technologie"] }),
  field("support", "Support", "obligations", "Engagements", { sectors: ["informatique", "technologie"] }),
  field("garanties", "Garanties", "obligations", "Engagements"),
  field("reception", "Réception des travaux ou des biens", "livrables", "Mission", { sectors: ["construction", "industrie"] }),
  field("definitions", "Définitions particulières", "definitions", "Cadre"),
  ...protections,
];

function blueprint(sections: Array<[string, string, string]>): BlueprintSection[] {
  return sections.map(([anchor, title, intro]) => ({ anchor, title, intro }));
}

export const DOCUMENT_TYPES: DocumentTypeDef[] = [
  {
    id: "contrat",
    label: "Contrat",
    description: "Encadrer une mission, une prestation ou une fourniture.",
    position: 1,
    blueprint: blueprint([
      ["objet", "Objet", "Le présent contrat a pour objet de définir les conditions dans lesquelles les parties réalisent la mission décrite ci-dessous."],
      ["parties", "Parties", "Les parties au présent contrat sont identifiées comme suit."],
      ["definitions", "Définitions", "Au sens du présent contrat, les termes suivants ont la signification indiquée, au singulier comme au pluriel."],
      ["portee", "Portée", "La mission est limitée à la portée décrite au présent article. Tout élément qui n'y figure pas fait l'objet d'un avenant."],
      ["livrables", "Livrables", "Le prestataire remet les livrables suivants, dans un état propre à leur utilisation prévue."],
      ["obligations", "Obligations", "Chaque partie exécute ses engagements de bonne foi, selon les règles de l'art et les délais convenus."],
      ["financier", "Conditions financières", "Les conditions financières de la mission sont les suivantes."],
      ["calendrier", "Calendrier", "Les parties retiennent le calendrier indicatif suivant, sauf ajustement écrit."],
      ["confidentialite", "Confidentialité", "Chaque partie conserve confidentielles les informations reçues de l'autre partie dans le cadre du contrat."],
      ["propriete", "Propriété intellectuelle", "Les droits sur les éléments préexistants et sur les développements spécifiques sont répartis comme suit."],
      ["resiliation", "Résiliation et droit applicable", "Le contrat prend fin dans les conditions ci-dessous. Le droit applicable et le règlement des différends complètent cet article."],
    ]),
    fields: contractFields,
  },
  {
    id: "cahier-des-charges",
    label: "Cahier des charges",
    description: "Décrire un besoin, un périmètre et des critères d'acceptation.",
    position: 2,
    blueprint: blueprint([
      ["contexte", "Contexte", "Le présent cahier des charges situe le besoin et le cadre dans lequel il s'inscrit."],
      ["parties", "Parties prenantes", "Les parties concernées par ce cahier des charges sont les suivantes."],
      ["besoins", "Besoins", "Les besoins à couvrir sont décrits ci-dessous."],
      ["objectifs", "Objectifs", "Les objectifs poursuivis sont les suivants."],
      ["perimetre", "Périmètre", "Le périmètre retenu, ainsi que ses limites, est le suivant."],
      ["fonctionnel", "Exigences fonctionnelles", "La solution doit permettre les fonctions suivantes."],
      ["technique", "Exigences techniques", "Les exigences techniques et contraintes de réalisation sont les suivantes."],
      ["livrables", "Livrables", "Les livrables attendus sont énumérés ci-dessous."],
      ["acceptation", "Critères d'acceptation", "Un livrable est accepté lorsqu'il satisfait les critères suivants."],
      ["calendrier", "Calendrier", "Le calendrier prévisionnel est le suivant."],
      ["ressources", "Ressources", "Les ressources et responsabilités pressenties sont les suivantes."],
      ["contraintes", "Contraintes", "Les contraintes connues à la date du document sont les suivantes."],
      ["budget", "Budget", "L'enveloppe budgétaire indicative est la suivante."],
      ["indicateurs", "Indicateurs de performance", "Le suivi s'appuie sur les indicateurs suivants."],
    ]),
    fields: [
      field("contexte", "Contexte", "contexte", "Besoin", { required: true }),
      field("besoins", "Besoins", "besoins", "Besoin", { required: true }),
      field("objectifs", "Objectifs", "objectifs", "Besoin", { required: true }),
      field("perimetre", "Périmètre", "perimetre", "Cadrage", { required: true }),
      field("exigences_fonctionnelles", "Exigences fonctionnelles", "fonctionnel", "Exigences", { required: true }),
      field("exigences_techniques", "Exigences techniques", "technique", "Exigences"),
      field("livrables", "Livrables", "livrables", "Réalisation"),
      field("criteres", "Critères d'acceptation", "acceptation", "Réalisation", { required: true }),
      field("calendrier", "Calendrier", "calendrier", "Pilotage"),
      field("ressources", "Ressources", "ressources", "Pilotage"),
      field("contraintes", "Contraintes", "contraintes", "Pilotage"),
      field("budget", "Budget", "budget", "Pilotage", text()),
      field("indicateurs", "Indicateurs de performance", "indicateurs", "Pilotage"),
      field("normes", "Normes applicables", "technique", "Exigences", { sectors: ["construction", "sante", "industrie", "administration"] }),
    ],
  },
  {
    id: "charte",
    label: "Charte",
    description: "Poser des principes communs et une gouvernance.",
    position: 3,
    blueprint: blueprint([
      ["objet", "Objet", "La présente charte énonce les principes que les parties choisissent de respecter."],
      ["parties", "Participants", "Les participants à la charte sont les suivants."],
      ["principes", "Principes", "Les principes directeurs sont les suivants."],
      ["roles", "Rôles", "Les rôles et responsabilités sont répartis comme suit."],
      ["engagements", "Engagements", "Chaque participant s'engage à ce qui suit."],
      ["gouvernance", "Gouvernance", "Le fonctionnement collectif est organisé comme suit."],
      ["revision", "Révision", "La charte est revue selon les modalités suivantes."],
    ]),
    fields: [
      field("objet", "Objet", "objet", "Fondation", { required: true }),
      field("principes", "Principes", "principes", "Fondation", { required: true }),
      field("roles", "Rôles", "roles", "Fonctionnement", { required: true }),
      field("engagements", "Engagements", "engagements", "Fonctionnement"),
      field("gouvernance", "Gouvernance", "gouvernance", "Fonctionnement"),
      field("revision", "Révision", "revision", "Suivi"),
    ],
  },
  {
    id: "convention",
    label: "Convention",
    description: "Formaliser une collaboration et des moyens partagés.",
    position: 4,
    blueprint: blueprint([
      ["objet", "Objet", "La présente convention a pour objet d'organiser la collaboration décrite ci-dessous."],
      ["parties", "Parties", "Les parties à la convention sont les suivantes."],
      ["engagements", "Engagements", "Les engagements de chacune des parties sont les suivants."],
      ["duree", "Durée", "La convention est conclue pour la durée suivante."],
      ["moyens", "Moyens", "Les moyens mobilisés sont les suivants."],
      ["suivi", "Suivi", "Le suivi de la convention est assuré comme suit."],
      ["resiliation", "Fin de la convention", "La convention prend fin dans les conditions suivantes."],
    ]),
    fields: [
      field("objet", "Objet", "objet", "Collaboration", { required: true }),
      field("engagements", "Engagements", "engagements", "Collaboration", { required: true }),
      field("moyens", "Moyens", "moyens", "Mise en oeuvre"),
      field("duree", "Durée", "duree", "Mise en oeuvre", text({ required: true })),
      field("suivi", "Suivi", "suivi", "Mise en oeuvre"),
      field("resiliation", "Fin de la convention", "resiliation", "Clôture"),
    ],
  },
  {
    id: "protocole",
    label: "Protocole d'entente",
    description: "Poser une intention commune avant un accord définitif.",
    position: 5,
    blueprint: blueprint([
      ["objet", "Objet", "Le présent protocole exprime l'intention des parties de collaborer selon les principes suivants. Il ne constitue pas, à lui seul, un engagement définitif sur les conditions commerciales."],
      ["parties", "Parties", "Les parties au protocole sont les suivantes."],
      ["intentions", "Intentions", "Les intentions communes sont les suivantes."],
      ["principes", "Principes de travail", "Les parties conviennent des principes de travail suivants."],
      ["etapes", "Prochaines étapes", "Les prochaines étapes envisagées sont les suivantes."],
      ["confidentialite", "Confidentialité", "Les échanges préparatoires restent confidentiels dans les conditions suivantes."],
      ["duree", "Durée", "Le protocole est valable pour la durée suivante."],
    ]),
    fields: [
      field("objet", "Objet", "objet", "Intention", { required: true }),
      field("intentions", "Intentions", "intentions", "Intention", { required: true }),
      field("principes", "Principes de travail", "principes", "Cadre"),
      field("etapes", "Prochaines étapes", "etapes", "Cadre", { required: true }),
      field("confidentialite", "Confidentialité", "confidentialite", "Cadre"),
      field("duree", "Durée", "duree", "Cadre", text()),
    ],
  },
  {
    id: "partenariat",
    label: "Entente de partenariat",
    description: "Définir les apports, la gouvernance et les droits d'un partenariat.",
    position: 6,
    blueprint: blueprint([
      ["objet", "Objet", "La présente entente organise le partenariat décrit ci-dessous."],
      ["parties", "Partenaires", "Les partenaires sont les suivants."],
      ["apports", "Apports", "Chaque partenaire apporte les éléments suivants."],
      ["gouvernance", "Gouvernance", "Les décisions du partenariat sont prises selon les modalités suivantes."],
      ["propriete", "Propriété des résultats", "Les résultats du partenariat sont attribués comme suit."],
      ["financier", "Conditions financières", "La répartition financière est la suivante."],
      ["duree", "Durée", "Le partenariat est conclu pour la durée suivante."],
      ["resiliation", "Retrait et fin", "Un partenaire peut se retirer dans les conditions suivantes."],
    ]),
    fields: [
      field("objet", "Objet du partenariat", "objet", "Partenariat", { required: true }),
      field("apports", "Apports de chaque partenaire", "apports", "Partenariat", { required: true }),
      field("gouvernance", "Gouvernance", "gouvernance", "Fonctionnement", { required: true }),
      field("propriete", "Propriété des résultats", "propriete", "Fonctionnement"),
      field("budget", "Répartition financière", "financier", "Conditions"),
      field("duree", "Durée", "duree", "Conditions", text({ required: true })),
      field("resiliation", "Retrait et fin", "resiliation", "Conditions"),
    ],
  },
  {
    id: "maintenance",
    label: "Contrat de maintenance",
    description: "Encadrer le maintien en condition et les niveaux de service.",
    position: 7,
    blueprint: blueprint([
      ["objet", "Objet", "Le présent contrat a pour objet la maintenance des éléments décrits ci-dessous."],
      ["parties", "Parties", "Les parties au contrat de maintenance sont les suivantes."],
      ["perimetre", "Périmètre", "La maintenance couvre le périmètre suivant."],
      ["niveaux", "Niveaux de service", "Les niveaux de service retenus sont les suivants."],
      ["delais", "Délais d'intervention", "Les délais d'intervention sont les suivants."],
      ["financier", "Conditions financières", "La rémunération de la maintenance est la suivante."],
      ["exclusions", "Exclusions", "Sont exclus du présent contrat les éléments suivants."],
      ["duree", "Durée", "Le contrat est conclu pour la durée suivante."],
    ]),
    fields: [
      field("objet", "Objet", "objet", "Maintenance", { required: true }),
      field("perimetre", "Périmètre couvert", "perimetre", "Maintenance", { required: true }),
      field("niveaux", "Niveaux de service", "niveaux", "Service", { required: true }),
      field("delais", "Délais d'intervention", "delais", "Service", { required: true }),
      field("exclusions", "Exclusions", "exclusions", "Service"),
      field("budget", "Rémunération", "financier", "Conditions", text({ required: true })),
      field("duree", "Durée", "duree", "Conditions", text({ required: true })),
    ],
  },
  {
    id: "sous-traitance",
    label: "Contrat de sous-traitance",
    description: "Confier une partie d'une mission à un sous-traitant.",
    position: 8,
    blueprint: blueprint([
      ["objet", "Objet", "Le présent contrat confie au sous-traitant la mission décrite ci-dessous."],
      ["parties", "Parties", "Le donneur d'ordre et le sous-traitant sont identifiés comme suit."],
      ["missions", "Mission sous-traitée", "La mission confiée est la suivante."],
      ["obligations", "Obligations", "Les obligations respectives sont les suivantes."],
      ["financier", "Prix", "Le prix de la sous-traitance est le suivant."],
      ["responsabilite", "Responsabilité", "La répartition des responsabilités est la suivante."],
      ["resiliation", "Résiliation", "Le contrat peut prendre fin dans les conditions suivantes."],
    ]),
    fields: [
      field("objet", "Objet", "objet", "Mission", { required: true }),
      field("missions", "Mission sous-traitée", "missions", "Mission", { required: true }),
      field("obligations", "Obligations", "obligations", "Engagements"),
      field("responsabilite", "Responsabilité", "responsabilite", "Engagements", { required: true }),
      field("budget", "Prix", "financier", "Conditions", text({ required: true })),
      field("paiement", "Modalités de paiement", "financier", "Conditions"),
      field("resiliation", "Résiliation", "resiliation", "Conditions"),
    ],
  },
  {
    id: "fourniture",
    label: "Contrat de fourniture",
    description: "Acheter des biens, avec prix, livraison et réception.",
    position: 9,
    blueprint: blueprint([
      ["objet", "Objet", "Le présent contrat a pour objet la fourniture des biens décrits ci-dessous."],
      ["parties", "Parties", "L'acheteur et le fournisseur sont identifiés comme suit."],
      ["biens", "Biens", "Les biens fournis sont les suivants."],
      ["prix", "Prix", "Le prix et ses modalités sont les suivants."],
      ["livraison", "Livraison", "Les conditions de livraison sont les suivantes."],
      ["reception", "Réception", "La réception des biens s'effectue comme suit."],
      ["garanties", "Garanties", "Les garanties consenties sont les suivantes."],
      ["resiliation", "Résiliation", "Le contrat peut être résilié dans les conditions suivantes."],
    ]),
    fields: [
      field("objet", "Objet", "objet", "Fourniture", { required: true }),
      field("biens", "Biens fournis", "biens", "Fourniture", { required: true }),
      field("budget", "Prix", "prix", "Conditions", text({ required: true })),
      field("paiement", "Modalités de paiement", "prix", "Conditions"),
      field("livraison", "Livraison", "livraison", "Exécution", { required: true }),
      field("reception", "Réception", "reception", "Exécution"),
      field("garanties", "Garanties", "garanties", "Exécution"),
      field("resiliation", "Résiliation", "resiliation", "Clôture"),
    ],
  },
  {
    id: "confidentialite",
    label: "Accord de confidentialité",
    description: "Protéger des informations échangées entre les parties.",
    position: 10,
    blueprint: blueprint([
      ["objet", "Objet", "Le présent accord a pour objet de protéger les informations confidentielles échangées entre les parties."],
      ["parties", "Parties", "Les parties à l'accord sont les suivantes."],
      ["definitions", "Définitions", "Constituent des informations confidentielles les éléments décrits ci-dessous, quel que soit leur support."],
      ["obligations", "Obligations", "La partie destinataire s'engage à protéger les informations reçues et à les utiliser uniquement pour la finalité convenue."],
      ["exceptions", "Exceptions", "L'obligation de confidentialité ne s'applique pas dans les cas suivants."],
      ["duree", "Durée", "L'obligation demeure en vigueur pendant la durée suivante."],
      ["restitution", "Restitution", "À la demande de la partie émettrice, les informations sont restituées ou détruites selon les modalités suivantes."],
      ["droit", "Droit applicable", "Le présent accord est régi par le droit indiqué ci-dessous."],
    ]),
    fields: [
      field("objet", "Finalité de l'échange", "objet", "Accord", { required: true }),
      field("informations", "Informations concernées", "definitions", "Accord", { required: true }),
      field("obligations", "Obligations du destinataire", "obligations", "Obligations", { required: true }),
      field("exceptions", "Exceptions", "exceptions", "Obligations"),
      field("duree", "Durée de l'obligation", "duree", "Durée", text({ required: true })),
      field("restitution", "Restitution ou destruction", "restitution", "Durée"),
      field("droit", "Droit applicable", "droit", "Durée", text()),
    ],
  },
  {
    id: "personnalise",
    label: "Document personnalisé",
    description: "Partir d'une structure souple, adaptée à votre entente.",
    position: 11,
    blueprint: blueprint([
      ["objet", "Objet", "Le présent document a pour objet ce qui est décrit ci-dessous."],
      ["parties", "Parties", "Les parties concernées sont les suivantes."],
      ["contexte", "Contexte", "Le contexte de l'entente est le suivant."],
      ["engagements", "Engagements", "Les engagements des parties sont les suivants."],
      ["conditions", "Conditions particulières", "Les conditions particulières sont les suivantes."],
      ["duree", "Durée", "La durée retenue est la suivante."],
    ]),
    fields: [
      field("objet", "Objet", "objet", "Document", { required: true }),
      field("contexte", "Contexte", "contexte", "Document", { required: true }),
      field("engagements", "Engagements", "engagements", "Document", { required: true }),
      field("conditions", "Conditions particulières", "conditions", "Document"),
      field("duree", "Durée", "duree", "Document", text()),
    ],
  },
];

export function sectorById(id: string) {
  return SECTORS.find((sector) => sector.id === id);
}

export function documentTypeById(id: string) {
  return DOCUMENT_TYPES.find((type) => type.id === id);
}

export function fieldVisible(item: FieldDef, sector: string) {
  if (item.sectors.length > 0 && !item.sectors.includes(sector)) return false;
  if (item.excludedSectors.includes(sector)) return false;
  return true;
}

export function fieldsFor(typeId: string, sector: string) {
  const type = documentTypeById(typeId);
  if (!type) return [];
  return type.fields.filter((item) => fieldVisible(item, sector));
}

export function searchDocumentTypes(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return DOCUMENT_TYPES;
  return DOCUMENT_TYPES.filter((type) =>
    `${type.label} ${type.description}`.toLowerCase().includes(needle),
  );
}
