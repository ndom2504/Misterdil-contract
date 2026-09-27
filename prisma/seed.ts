import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DOCUMENT_TYPES } from "../src/lib/catalog";
import { ROLE_PERMISSIONS, WORKSPACE_ROLES } from "../src/lib/domain";
import { progressFromSections } from "../src/lib/progress";

const prisma = new PrismaClient();

const sept26a = new Date("2026-09-26T14:20:00.000Z");
const sept26b = new Date("2026-09-26T18:05:00.000Z");
const sept26c = new Date("2026-09-26T20:10:00.000Z");
const sept27a = new Date("2026-09-27T13:15:00.000Z");
const sept27b = new Date("2026-09-27T15:42:00.000Z");

async function reset() {
  await prisma.comment.deleteMany();
  await prisma.discussion.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.signature.deleteMany();
  await prisma.formResponse.deleteMany();
  await prisma.documentSection.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.aiInteraction.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.stakeholder.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.document.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.formTemplate.deleteMany();
  await prisma.documentType.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

async function demoPdf() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("MISTERDIL", { x: 48, y: 790, size: 12, font, color: rgb(0.12, 0.31, 0.85) });
  page.drawText("Note d'architecture - Application mobile clients", { x: 48, y: 750, size: 16, font });
  page.drawText("Document associe a l'espace de travail. Version de demonstration.", { x: 48, y: 720, size: 11, font });
  const directory = path.join(process.cwd(), "data", "uploads");
  await mkdir(directory, { recursive: true });
  const name = "note-architecture.pdf";
  await writeFile(path.join(directory, name), Buffer.from(await pdf.save()));
  const csv = "jalon,date,responsable\nCadrage,2026-10-15,NovaSoft\nBeta,2027-03-31,NovaSoft\nMise en production,2027-09-30,Horizon\n";
  await writeFile(path.join(directory, "planning-jalons.csv"), csv, "utf8");
  return { pdf: name, csv: "planning-jalons.csv" };
}

async function main() {
  await reset();
  const passwordHash = await bcrypt.hash("Misterdil2026", 10);
  const files = await demoPdf();

  for (const role of WORKSPACE_ROLES) {
    await prisma.role.create({
      data: {
        id: role.id,
        label: role.label,
        description: role.description,
        permissions: { create: ROLE_PERMISSIONS[role.id].map((key) => ({ key })) },
      },
    });
  }

  for (const type of DOCUMENT_TYPES) {
    await prisma.documentType.create({
      data: {
        id: type.id,
        label: type.label,
        description: type.description,
        position: type.position,
        blueprint: JSON.stringify(type.blueprint),
        templates: {
          create: {
            name: type.label,
            fields: {
              create: type.fields.map((field, index) => ({
                key: field.key,
                label: field.label,
                help: field.help,
                fieldType: field.fieldType,
                required: field.required,
                position: index + 1,
                groupLabel: field.group,
                sectionAnchor: field.anchor,
                optionsJson: field.options.length ? JSON.stringify(field.options) : "",
                sectors: field.sectors.join(","),
                excludedSectors: field.excludedSectors.join(","),
              })),
            },
          },
        },
      },
    });
  }

  await prisma.organization.createMany({
    data: [
      { id: "org_horizon", name: "Horizon", sector: "sante", ownerId: "user_jean" },
      { id: "org_novasoft", name: "NovaSoft", sector: "informatique", ownerId: "user_marie" },
      { id: "org_atelier", name: "Atelier Conseil", sector: "services", ownerId: "user_paul" },
    ],
  });

  await prisma.user.createMany({
    data: [
      {
        id: "user_jean",
        email: "jean.dupont@horizon.ca",
        name: "Jean Dupont",
        passwordHash,
        phone: "514 555 0142",
        jobTitle: "Directeur des systèmes d'information",
        profileType: "Dirigeant",
        onboarded: true,
        organizationId: "org_horizon",
      },
      {
        id: "user_marie",
        email: "marie.lefebvre@novasoft.ca",
        name: "Marie Lefebvre",
        passwordHash,
        phone: "438 555 0198",
        jobTitle: "Directrice de projet",
        profileType: "Chef de projet",
        onboarded: true,
        organizationId: "org_novasoft",
      },
      {
        id: "user_paul",
        email: "paul.martin@atelierconseil.ca",
        name: "Paul Martin",
        passwordHash,
        phone: "514 555 0177",
        jobTitle: "Conseiller",
        profileType: "Consultant",
        onboarded: true,
        organizationId: "org_atelier",
      },
    ],
  });

  await prisma.workspace.createMany({
    data: [
      {
        id: "ws_mobile",
        organizationId: "org_horizon",
        name: "Application mobile clients",
        description: "Conception et livraison de l'application mobile destinée aux clients de Horizon.",
        sector: "informatique",
        domain: "Développement applicatif",
        createdById: "user_jean",
        createdAt: sept26a,
        updatedAt: sept27b,
      },
      {
        id: "ws_donnees",
        organizationId: "org_horizon",
        name: "Partenariat données cliniques",
        description: "Échanges confidentiels avec la Clinique Nord.",
        sector: "sante",
        domain: "Protection des renseignements",
        createdById: "user_jean",
        createdAt: sept26a,
        updatedAt: sept27a,
      },
      {
        id: "ws_cloud",
        organizationId: "org_horizon",
        name: "Infrastructure infonuagique",
        description: "Protocole préparatoire avec un fournisseur d'hébergement.",
        sector: "informatique",
        domain: "Infrastructure",
        createdById: "user_jean",
        createdAt: sept26a,
        updatedAt: sept26c,
      },
    ],
  });

  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: "ws_mobile", userId: "user_jean", role: "CREATOR" },
      { workspaceId: "ws_mobile", userId: "user_marie", role: "PARTICIPANT" },
      { workspaceId: "ws_mobile", userId: "user_paul", role: "PARTICIPANT" },
      { workspaceId: "ws_donnees", userId: "user_jean", role: "CREATOR" },
      { workspaceId: "ws_donnees", userId: "user_paul", role: "PARTICIPANT" },
      { workspaceId: "ws_cloud", userId: "user_jean", role: "CREATOR" },
    ],
  });

  const contractSections = [
    ["sec_objet", "objet", "Objet", "Le présent contrat a pour objet la conception, le développement et la livraison d'une application mobile destinée aux clients de Horizon. L'application permet la prise de rendez-vous, la consultation du dossier et la réception de notifications.\n\nLa mission vise les plateformes iOS et Android. Elle comprend le cadrage, la réalisation, les essais et le transfert aux équipes du Client.", "VALIDATED"],
    ["sec_parties", "parties", "Parties", "Horizon, représentée par Jean Dupont, Directeur des systèmes d'information, en qualité de client.\n\nNovaSoft, représentée par Marie Lefebvre, Directrice de projet, en qualité de prestataire.\n\nAtelier Conseil, représentée par Paul Martin, conseiller, en qualité de consultant du Client.", "VALIDATED"],
    ["sec_definitions", "definitions", "Définitions", "« Application » désigne le logiciel mobile développé au titre du présent contrat.\n« Livrable » désigne tout élément remis au Client.\n« Données » désigne les informations confiées par le Client.\n« Jour » désigne un jour calendaire, sauf mention contraire.", "VALIDATED"],
    ["sec_portee", "portee", "Portée", "La mission comprend la conception fonctionnelle, le développement, les essais, le déploiement initial et le transfert de connaissances. Sont exclus l'exploitation courante au-delà de la garantie et les évolutions qui ne figurent pas au cahier des charges.\n\nLe périmètre détaillé est celui du cahier des charges « Application mobile clients », accepté par les parties.", "VALIDATED"],
    ["sec_livrables", "livrables", "Livrables", "Les livrables attendus sont : le dossier de spécifications validé, les versions iOS et Android, la documentation d'exploitation, la formation des équipes du Client et le dépôt du code source.\n\nChaque livrable fait l'objet d'une recette. Le silence du Client pendant dix (10) jours après la remise vaut acceptation, sauf réserve écrite.", "VALIDATED"],
    ["sec_obligations", "obligations", "Obligations", "NovaSoft exécute la mission selon les règles de l'art et tient le Client informé de l'avancement. Horizon fournit les accès, les contenus et les décisions dans les délais convenus. Atelier Conseil éclaire le Client sans se substituer à NovaSoft.", "VALIDATED"],
    ["sec_financier", "financier", "Conditions financières", "Le budget de la mission est fixé à 186 000 $ CAD, hors taxes. La facturation suit trois jalons : 30 % à la commande, 40 % à la recette de la version bêta et 30 % à la réception.\n\nLes factures sont payables sous trente (30) jours.", "IN_DISCUSSION"],
    ["sec_calendrier", "calendrier", "Calendrier", "La mission dure douze (12) mois à compter du 1er octobre 2026. Jalons : cadrage au mois 1, version bêta au mois 6, recette au mois 10, mise en production au mois 12.\n\nUn retard imputable à l'une des parties décale d'autant les jalons qui en dépendent.", "VALIDATED"],
    ["sec_confidentialite", "confidentialite", "Confidentialité", "Chaque partie conserve confidentielles les informations reçues de l'autre partie et ne les utilise que pour l'exécution du contrat. Cette obligation survit pendant trois (3) ans après la fin du contrat.", "VALIDATED"],
    ["sec_propriete", "propriete", "Propriété intellectuelle", "À compter du paiement intégral, Horizon acquiert les droits patrimoniaux sur les développements spécifiques. NovaSoft conserve ses composantes préexistantes et concède au Client une licence non exclusive d'utilisation.\n\nLes données du Client restent la propriété du Client.", "IN_DISCUSSION"],
    ["sec_resiliation", "resiliation", "Résiliation et droit applicable", "Chaque partie peut résilier le contrat en cas de manquement grave non corrigé dans les trente (30) jours d'une mise en demeure. Le Client peut résilier pour convenance avec un préavis de soixante (60) jours, sous réserve du paiement des travaux réalisés.\n\nLe contrat est régi par le droit du Québec. Les parties recherchent d'abord une solution amiable.", "NOT_STARTED"],
  ] as const;

  const stats = progressFromSections(contractSections.map((section) => ({ status: section[4] })));
  if (stats.percent !== 74 || stats.validated !== 8 || stats.discussion !== 2 || stats.todo !== 1 || stats.total !== 11) {
    throw new Error(`Progression de démonstration inattendue : ${JSON.stringify(stats)}`);
  }

  await prisma.document.create({
    data: {
      id: "doc_contrat",
      workspaceId: "ws_mobile",
      typeId: "contrat",
      title: "Contrat de prestation informatique",
      sector: "informatique",
      domain: "Développement applicatif",
      description: "Nous souhaitons conclure une entente avec une entreprise informatique pour développer une application mobile destinée à nos clients.",
      briefJson: JSON.stringify({
        objectif: "Développement d'une application mobile",
        client: "Horizon",
        prestataire: "NovaSoft",
        duree: "12 mois",
      }),
      briefConfirmed: true,
      wizardStep: 6,
      status: "IN_DISCUSSION",
      createdById: "user_jean",
      moderatorId: "user_jean",
      createdAt: sept26a,
      updatedAt: sept27b,
      sections: {
        create: contractSections.map((section, index) => ({
          id: section[0],
          anchor: section[1],
          title: section[2],
          content: section[3],
          status: section[4],
          position: index + 1,
        })),
      },
      stakeholders: {
        create: [
          {
            id: "stk_jean",
            userId: "user_jean",
            name: "Jean Dupont",
            organization: "Horizon",
            partyType: "CLIENT",
            email: "jean.dupont@horizon.ca",
            phone: "514 555 0142",
            representative: "Jean Dupont",
            jobTitle: "Directeur des systèmes d'information",
            address: "1000, rue Sainte-Catherine Ouest, Montréal",
            accessRole: "MODERATOR",
          },
          {
            id: "stk_marie",
            userId: "user_marie",
            name: "Marie Lefebvre",
            organization: "NovaSoft",
            partyType: "PROVIDER",
            email: "marie.lefebvre@novasoft.ca",
            phone: "438 555 0198",
            representative: "Marie Lefebvre",
            jobTitle: "Directrice de projet",
            address: "400, avenue McGill College, Montréal",
            accessRole: "PARTICIPANT",
          },
          {
            id: "stk_paul",
            userId: "user_paul",
            name: "Paul Martin",
            organization: "Atelier Conseil",
            partyType: "CONSULTANT",
            email: "paul.martin@atelierconseil.ca",
            phone: "514 555 0177",
            representative: "Paul Martin",
            jobTitle: "Conseiller",
            address: "",
            accessRole: "PARTICIPANT",
          },
        ],
      },
      responses: {
        create: [
          { fieldKey: "objet", value: "Développement d'une application mobile destinée aux clients de Horizon." },
          { fieldKey: "portee", value: "Conception, développement iOS et Android, essais, déploiement initial et transfert." },
          { fieldKey: "livrables", value: "Spécifications, applications, documentation, formation et code source." },
          { fieldKey: "duree", value: "12 mois" },
          { fieldKey: "budget", value: "186 000 $ CAD" },
          { fieldKey: "paiement", value: "30 % à la commande, 40 % à la bêta, 30 % à la réception. Délai de 30 jours." },
          { fieldKey: "calendrier", value: "Cadrage, bêta au mois 6, recette au mois 10, production au mois 12." },
        ],
      },
    },
  });

  await prisma.discussion.create({
    data: {
      id: "disc_paiement",
      documentId: "doc_contrat",
      sectionId: "sec_financier",
      title: "Article 7 — Modalités de paiement",
      status: "OPEN",
      createdAt: sept27a,
      updatedAt: sept27b,
      comments: {
        create: [
          { authorId: "user_jean", authorName: "Jean Dupont", body: "Je propose un délai de paiement de 30 jours.", createdAt: sept27a },
          { authorId: "user_marie", authorName: "Marie Lefebvre", body: "Nous préférons 15 jours.", createdAt: new Date("2026-09-27T14:05:00.000Z") },
          {
            authorName: "Misterdil AI",
            isAi: true,
            body: "Les parties ne sont pas d'accord sur le délai de paiement. Voici trois formulations possibles : quinze jours à compter de la facture ; trente jours fin de mois ; quinze jours pour les jalons de recette et trente jours pour le solde. Le modérateur choisit.",
            createdAt: sept27b,
          },
        ],
      },
    },
  });

  await prisma.discussion.create({
    data: {
      documentId: "doc_contrat",
      sectionId: "sec_livrables",
      title: "Article 5 — Dépôt du code source",
      status: "RESOLVED",
      createdAt: sept26b,
      updatedAt: sept26c,
      comments: {
        create: [
          { authorId: "user_paul", authorName: "Paul Martin", body: "Le transfert du code source devrait être un livrable explicite.", createdAt: sept26b },
          { authorId: "user_jean", authorName: "Jean Dupont", body: "C'est ajouté à l'article 5. Je considère le point résolu.", createdAt: sept26c },
        ],
      },
    },
  });

  await prisma.proposal.createMany({
    data: [
      {
        documentId: "doc_contrat",
        sectionId: "sec_financier",
        authorId: "user_marie",
        authorName: "Marie Lefebvre",
        summary: "Modification proposée par Marie",
        previousText: "trente (30) jours",
        proposedText: "quinze (15) jours",
        status: "PENDING",
        createdAt: new Date("2026-09-27T14:12:00.000Z"),
      },
      {
        documentId: "doc_contrat",
        sectionId: "sec_propriete",
        authorName: "Misterdil AI",
        isAi: true,
        summary: "Formulation proposée par Misterdil AI",
        previousText: "NovaSoft conserve ses composantes préexistantes et concède au Client une licence non exclusive d'utilisation.",
        proposedText: "NovaSoft conserve la propriété de ses composantes préexistantes et concède au Client une licence non exclusive, mondiale et gratuite, limitée à l'exploitation de l'Application.",
        status: "PENDING",
        createdAt: sept26c,
      },
    ],
  });

  const snapshot = (override?: string) =>
    JSON.stringify(
      contractSections.map((section, index) => ({
        anchor: section[1],
        title: section[2],
        content: section[0] === "sec_portee" && override ? override : section[3],
        status: section[4],
        position: index + 1,
      })),
    );

  await prisma.documentVersion.createMany({
    data: [
      {
        documentId: "doc_contrat",
        label: "Version initiale",
        createdByName: "Misterdil AI",
        createdAt: sept26a,
        snapshot: snapshot("La mission comprend la conception et le développement de l'application mobile."),
      },
      {
        documentId: "doc_contrat",
        label: "Révision de l'article 4",
        createdByName: "Jean Dupont",
        createdAt: sept27a,
        snapshot: snapshot(),
      },
    ],
  });

  await prisma.activity.createMany({
    data: [
      { workspaceId: "ws_mobile", documentId: "doc_contrat", actorId: "user_paul", actorName: "Paul Martin", kind: "INVITE", message: "Paul Martin a rejoint le projet.", createdAt: sept26b },
      { workspaceId: "ws_mobile", documentId: "doc_contrat", actorName: "Misterdil AI", kind: "AI", message: "Misterdil AI a proposé une nouvelle clause.", createdAt: sept26c },
      { workspaceId: "ws_mobile", documentId: "doc_contrat", actorId: "user_marie", actorName: "Marie Lefebvre", kind: "VALIDATE", message: "Marie Lefebvre a validé l'article 2.", createdAt: sept27a },
      { workspaceId: "ws_mobile", documentId: "doc_contrat", actorId: "user_jean", actorName: "Jean Dupont", kind: "EDIT", message: "Jean Dupont a modifié l'article 4.", createdAt: sept27b },
      { workspaceId: "ws_mobile", documentId: "doc_contrat", actorId: "user_marie", actorName: "Marie Lefebvre", kind: "COMMENT", message: "Marie Lefebvre a commenté les modalités de paiement.", createdAt: new Date("2026-09-27T14:05:00.000Z") },
      { workspaceId: "ws_mobile", documentId: "doc_contrat", actorId: "user_marie", actorName: "Marie Lefebvre", kind: "PROPOSAL", message: "Marie Lefebvre a proposé de remplacer 30 jours par 15 jours.", createdAt: new Date("2026-09-27T14:12:00.000Z") },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: "user_jean", kind: "COMMENT", title: "Nouveau commentaire", body: "Marie Lefebvre a commenté les modalités de paiement.", href: "/documents/doc_contrat?onglet=discussions", read: false, createdAt: new Date("2026-09-27T14:05:00.000Z") },
      { userId: "user_jean", kind: "PROPOSAL", title: "Modification proposée", body: "Marie Lefebvre propose un délai de 15 jours.", href: "/documents/doc_contrat", read: false, createdAt: new Date("2026-09-27T14:12:00.000Z") },
      { userId: "user_jean", kind: "INVITE", title: "Nouveau participant", body: "Paul Martin a rejoint Application mobile clients.", href: "/espaces/ws_mobile", read: true, createdAt: sept26b },
      { userId: "user_marie", kind: "INVITE", title: "Invitation à une entente", body: "Jean Dupont vous a ajoutée au contrat de prestation informatique.", href: "/documents/doc_contrat", read: true, createdAt: sept26a },
      { userId: "user_jean", kind: "SIGNATURE", title: "Signature demandée", body: "L'accord de confidentialité attend encore une signature.", href: "/documents/doc_nda?onglet=signature", read: false, createdAt: sept27a },
    ],
  });

  await prisma.document.create({
    data: {
      id: "doc_cahier",
      workspaceId: "ws_mobile",
      typeId: "cahier-des-charges",
      title: "Cahier des charges — Application mobile",
      sector: "informatique",
      domain: "Développement applicatif",
      description: "Besoins fonctionnels de l'application mobile clients.",
      briefConfirmed: true,
      wizardStep: 6,
      status: "PENDING_VALIDATION",
      createdById: "user_jean",
      moderatorId: "user_jean",
      createdAt: sept26a,
      updatedAt: sept27a,
      sections: {
        create: [
          ["Contexte", "Horizon souhaite offrir à ses clients un parcours mobile simple pour les rendez-vous et le suivi.", "VALIDATED"],
          ["Besoins", "Prise de rendez-vous, consultation du dossier, notifications et espace sécurisé.", "VALIDATED"],
          ["Objectifs", "Réduire les appels entrants et donner un accès autonome aux clients.", "VALIDATED"],
          ["Périmètre", "Applications iOS et Android, hors exploitation à long terme.", "VALIDATED"],
          ["Exigences fonctionnelles", "Création de compte, agenda, messagerie de notification et historique.", "VALIDATED"],
          ["Exigences techniques", "Hébergement au Canada et chiffrement des échanges.", "IN_DISCUSSION"],
          ["Critères d'acceptation", "Recette sur un parcours complet de prise de rendez-vous.", "CHANGES_REQUESTED"],
          ["Indicateurs", "Taux d'adoption à 90 jours et délai moyen de prise de rendez-vous.", "NOT_STARTED"],
        ].map((section, index) => ({
          anchor: `cahier-${index + 1}`,
          title: section[0],
          content: section[1],
          status: section[2],
          position: index + 1,
        })),
      },
      stakeholders: {
        create: [{ userId: "user_jean", name: "Jean Dupont", organization: "Horizon", partyType: "CLIENT", email: "jean.dupont@horizon.ca", representative: "Jean Dupont", jobTitle: "Directeur des systèmes d'information", accessRole: "MODERATOR" }],
      },
    },
  });

  await prisma.document.create({
    data: {
      id: "doc_nda",
      workspaceId: "ws_donnees",
      typeId: "confidentialite",
      title: "Accord de confidentialité — Partenariat données",
      sector: "sante",
      domain: "Protection des renseignements",
      description: "Échanges préparatoires avec la Clinique Nord.",
      briefConfirmed: true,
      wizardStep: 6,
      status: "PENDING_SIGNATURE",
      createdById: "user_jean",
      moderatorId: "user_jean",
      createdAt: sept26a,
      updatedAt: sept26c,
      sections: {
        create: ["Objet", "Parties", "Définitions", "Obligations", "Durée", "Droit applicable"].map((title, index) => ({
          anchor: `nda-${index + 1}`,
          title,
          content: "Les parties protègent les renseignements échangés dans le cadre du partenariat de données et les utilisent uniquement pour évaluer la collaboration.",
          status: "VALIDATED",
          position: index + 1,
        })),
      },
      stakeholders: {
        create: [
          { id: "stk_nda_jean", userId: "user_jean", name: "Jean Dupont", organization: "Horizon", partyType: "CLIENT", email: "jean.dupont@horizon.ca", representative: "Jean Dupont", accessRole: "MODERATOR" },
          { id: "stk_claire", name: "Claire Gagnon", organization: "Clinique Nord", partyType: "PARTNER", email: "claire.gagnon@cliniquenord.ca", representative: "Claire Gagnon", jobTitle: "Directrice médicale", accessRole: "PARTICIPANT" },
          { userId: "user_paul", name: "Paul Martin", organization: "Atelier Conseil", partyType: "CONSULTANT", email: "paul.martin@atelierconseil.ca", representative: "Paul Martin", accessRole: "READER" },
        ],
      },
      signatures: {
        create: [
          { stakeholderId: "stk_nda_jean", status: "SIGNED", signerName: "Jean Dupont", signerEmail: "jean.dupont@horizon.ca", signedAt: sept26c, method: "INTERNAL" },
          { stakeholderId: "stk_claire", status: "REQUIRED", method: "INTERNAL" },
        ],
      },
    },
  });

  await prisma.document.create({
    data: {
      id: "doc_charte",
      workspaceId: "ws_donnees",
      typeId: "charte",
      title: "Charte de gouvernance des données",
      sector: "sante",
      domain: "Protection des renseignements",
      description: "Principes communs de gouvernance.",
      briefConfirmed: true,
      wizardStep: 6,
      status: "FINAL",
      createdById: "user_jean",
      moderatorId: "user_jean",
      createdAt: sept26a,
      updatedAt: sept26b,
      sections: {
        create: ["Objet", "Principes", "Rôles", "Gouvernance"].map((title, index) => ({
          anchor: `charte-${index + 1}`,
          title,
          content: "Les participants appliquent des principes de minimisation, de traçabilité et de responsabilité sur les données échangées.",
          status: "LOCKED",
          position: index + 1,
        })),
      },
      stakeholders: {
        create: [
          { id: "stk_charte_jean", userId: "user_jean", name: "Jean Dupont", organization: "Horizon", partyType: "CLIENT", email: "jean.dupont@horizon.ca", accessRole: "MODERATOR" },
          { id: "stk_charte_claire", name: "Claire Gagnon", organization: "Clinique Nord", partyType: "PARTNER", email: "claire.gagnon@cliniquenord.ca", accessRole: "PARTICIPANT" },
          { userId: "user_paul", name: "Paul Martin", organization: "Atelier Conseil", partyType: "CONSULTANT", email: "paul.martin@atelierconseil.ca", accessRole: "READER" },
        ],
      },
      signatures: {
        create: [
          { stakeholderId: "stk_charte_jean", status: "SIGNED", signerName: "Jean Dupont", signerEmail: "jean.dupont@horizon.ca", signedAt: sept26b, method: "INTERNAL" },
          { stakeholderId: "stk_charte_claire", status: "SIGNED", signerName: "Claire Gagnon", signerEmail: "claire.gagnon@cliniquenord.ca", signedAt: sept26b, method: "INTERNAL" },
        ],
      },
    },
  });

  await prisma.document.create({
    data: {
      id: "doc_protocole",
      workspaceId: "ws_cloud",
      typeId: "protocole",
      title: "Protocole d'entente — Fournisseur infonuagique",
      sector: "informatique",
      domain: "Infrastructure",
      description: "Intention de discuter d'un hébergement au Canada.",
      briefConfirmed: false,
      wizardStep: 3,
      status: "DRAFT",
      createdById: "user_jean",
      moderatorId: "user_jean",
      createdAt: sept26c,
      updatedAt: sept26c,
      stakeholders: {
        create: [{ userId: "user_jean", name: "Jean Dupont", organization: "Horizon", partyType: "CLIENT", email: "jean.dupont@horizon.ca", accessRole: "MODERATOR" }],
      },
    },
  });

  await prisma.attachment.createMany({
    data: [
      { workspaceId: "ws_mobile", documentId: "doc_contrat", name: "Note d'architecture.pdf", mimeType: "application/pdf", size: 12000, storagePath: files.pdf, uploadedById: "user_jean", createdAt: sept26b },
      { workspaceId: "ws_mobile", documentId: "doc_cahier", name: "Planning des jalons.csv", mimeType: "text/csv", size: 180, storagePath: files.csv, uploadedById: "user_jean", createdAt: sept26c },
    ],
  });

  console.log("Données de démonstration prêtes.");
  console.log("Jean Dupont — jean.dupont@horizon.ca — Misterdil2026");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
