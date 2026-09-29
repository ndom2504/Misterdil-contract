import { EXTRA_DOMAINS, sectorById } from "@/lib/catalog";
import type { ProgressStats } from "@/lib/progress";

export type Understanding = {
  objectif: string;
  client: string;
  prestataire: string;
  duree: string;
};

export type AssistantContext = {
  userName: string;
  document: null | {
    title: string;
    typeLabel: string;
    sector: string;
    domain: string;
    description: string;
    status: string;
    moderator: string;
    progress: ProgressStats;
    sections: { title: string; anchor: string; status: string; content: string }[];
    parties: { name: string; organization: string; partyType: string }[];
    discussions: { title: string; status: string; comments: { author: string; body: string }[] }[];
    proposals: { author: string; status: string; previousText: string; proposedText: string; sectionTitle: string }[];
    activities: { message: string; createdAt: string }[];
    missing: string[];
  };
};

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function complete(messages: { role: "system" | "user" | "assistant"; content: string }[], json = false) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        messages,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

const SYSTEM = `Tu es Misterdil AI, l'assistant intégré à la plateforme Misterdil.
Tu aides à structurer des ententes professionnelles. Tu proposes, tu n'adoptes jamais une décision définitive.
Le modérateur décide. Les parties valident.
Réponds en français, de façon brève, concrète et professionnelle.
Utilise uniquement le contexte fourni. Si une information manque, dis-le.
N'invente pas de faits juridiques locaux ni de montants absents du contexte.`;

export function analyzeLocally(input: {
  description: string;
  organizationName: string;
  parties: { organization: string; name: string; partyType: string }[];
}): Understanding {
  const text = fold(input.description);
  const mobile = text.includes("application mobile");
  const months = input.description.match(/(\d+)\s*mois/i);
  const clientParty = input.parties.find((party) => party.partyType === "CLIENT");
  const providerParty = input.parties.find((party) => party.partyType === "PROVIDER" || party.partyType === "SUPPLIER");

  let objectif = "À préciser à partir de la description";
  if (mobile) objectif = "Développement d'une application mobile";
  else if (text.includes("confidential")) objectif = "Protection d'informations confidentielles";
  else if (text.includes("maintenance")) objectif = "Maintenance d'un service ou d'un équipement";
  else if (text.includes("partenariat")) objectif = "Mise en place d'un partenariat";
  else if (input.description.trim()) objectif = input.description.trim().split(/(?<=\.)\s/)[0].slice(0, 180);

  return {
    objectif,
    client: clientParty?.organization || clientParty?.name || input.organizationName || "Entreprise A",
    prestataire: providerParty?.organization || providerParty?.name || (text.includes("informatique") ? "Entreprise B" : "À confirmer"),
    duree: months ? `${months[1]} mois` : mobile ? "12 mois" : "À préciser",
  };
}

export async function analyzeDescription(input: {
  description: string;
  sectorLabel: string;
  domain: string;
  organizationName: string;
  parties: { organization: string; name: string; partyType: string }[];
}) {
  const local = analyzeLocally(input);
  const ai = await complete(
    [
      { role: "system", content: `${SYSTEM} Réponds uniquement en JSON avec les clés objectif, client, prestataire, duree.` },
      {
        role: "user",
        content: JSON.stringify({
          description: input.description,
          secteur: input.sectorLabel,
          domaine: input.domain,
          organisation: input.organizationName,
          parties: input.parties,
          hypothese: local,
        }),
      },
    ],
    true,
  );

  if (!ai) return local;
  try {
    const parsed = JSON.parse(ai) as Partial<Understanding>;
    return {
      objectif: parsed.objectif?.trim() || local.objectif,
      client: parsed.client?.trim() || local.client,
      prestataire: parsed.prestataire?.trim() || local.prestataire,
      duree: parsed.duree?.trim() || local.duree,
    };
  } catch {
    return local;
  }
}

export function suggestDomainsLocally(sectorId: string, current: string[]) {
  const known = new Set(current.map((item) => fold(item)));
  return (EXTRA_DOMAINS[sectorId] ?? ["Activité spécialisée"]).filter((item) => !known.has(fold(item)));
}

export async function suggestDomains(sectorId: string, current: string[]) {
  const local = suggestDomainsLocally(sectorId, current);
  const sector = sectorById(sectorId);
  const ai = await complete(
    [
      { role: "system", content: `${SYSTEM} Propose 4 domaines d'activité complémentaires, courts (2 à 4 mots), différents de ceux déjà proposés. Réponds en JSON : {"domaines":["..."]}.` },
      { role: "user", content: `Secteur : ${sector?.label ?? sectorId}. Domaines déjà proposés : ${current.join(", ") || "aucun"}.` },
    ],
    true,
  );
  if (!ai) return local;
  try {
    const parsed = JSON.parse(ai) as { domaines?: string[] };
    const known = new Set(current.map((item) => fold(item)));
    const extra = (parsed.domaines ?? [])
      .map((item) => item.trim())
      .filter((item) => item && item.length <= 60 && !known.has(fold(item)));
    return extra.length ? [...new Set(extra)] : local;
  } catch {
    return local;
  }
}

function inconsistencies(context: NonNullable<AssistantContext["document"]>) {
  const notes: string[] = [];
  const finance = context.sections.find((section) => section.anchor === "financier" || /financier|paiement|prix/i.test(section.title));
  const paymentProposal = context.proposals.find((proposal) => proposal.status === "PENDING" && /15|quinze/i.test(proposal.proposedText));
  if (finance && /30|trente/i.test(finance.content) && paymentProposal) {
    notes.push("Le texte retient encore un délai de 30 jours, alors qu'une proposition demande 15 jours. Le modérateur doit trancher.");
  }
  const open = context.discussions.filter((discussion) => discussion.status === "OPEN");
  if (open.length) {
    notes.push(`${open.length} discussion${open.length > 1 ? "s" : ""} reste${open.length > 1 ? "nt" : ""} ouverte${open.length > 1 ? "s" : ""}.`);
  }
  if (context.missing.length) {
    notes.push(`${context.missing.length} information${context.missing.length > 1 ? "s" : ""} recommandée${context.missing.length > 1 ? "s" : ""} manque${context.missing.length > 1 ? "nt" : ""} encore : ${context.missing.slice(0, 4).join(", ")}.`);
  }
  return notes;
}

function explainSection(context: NonNullable<AssistantContext["document"]>, question: string) {
  const folded = fold(question);
  const section =
    context.sections.find((item) => folded.includes(fold(item.title)) || folded.includes(fold(item.anchor))) ??
    context.sections.find((item) => item.status === "IN_DISCUSSION") ??
    context.sections[0];
  if (!section) return "Aucune section n'est encore disponible.";
  const excerpt = section.content.split("\n").filter(Boolean).slice(0, 4).join(" ");
  return `${section.title}\n\nEn clair : cette section fixe ${section.title.toLowerCase()} du document. Elle est actuellement « ${section.status === "VALIDATED" ? "validée" : section.status === "IN_DISCUSSION" ? "en discussion" : "non close"} ».\n\nExtrait : ${excerpt}\n\nJe peux proposer une autre formulation. Seul le modérateur peut l'accepter.`;
}

export function assistLocally(question: string, context: AssistantContext) {
  if (!context.document) {
    return `${context.userName.split(" ")[0]}, je peux travailler sur un document auquel vous avez accès. Ouvrez une entente, ou demandez-moi où en sont vos espaces depuis le tableau de bord.`;
  }

  const doc = context.document;
  const q = fold(question);
  const progressLine = `« ${doc.title} » est complété à ${doc.progress.percent} %. ${doc.progress.validated} / ${doc.progress.total} sections sont validées, ${doc.progress.discussion} sont en discussion, ${doc.progress.todo} restent à compléter.`;

  if (q.includes("manque") || q.includes("incomplet") || q.includes("necessaire")) {
    const openSections = doc.sections.filter((section) => section.status !== "VALIDATED" && section.status !== "LOCKED");
    return [
      progressLine,
      doc.missing.length ? `Informations encore utiles : ${doc.missing.join(", ")}.` : "Les informations demandées au formulaire sont renseignées.",
      openSections.length ? `Sections non closes : ${openSections.map((section) => section.title).join(", ")}.` : "Toutes les sections sont validées ou verrouillées.",
      "Prochaine action recommandée : traiter les points en discussion, puis demander la validation des parties.",
    ].join("\n\n");
  }

  if (q.includes("resume") || q.includes("hier") || q.includes("modification")) {
    if (!doc.activities.length) return "Aucune modification n'est encore consignée dans l'historique.";
    return ["Voici les derniers mouvements :", ...doc.activities.slice(0, 6).map((item) => `• ${item.message}`), "Je peux détailler l'une de ces étapes."].join("\n");
  }

  if (q.includes("discussion") || q.includes("desaccord") || q.includes("point")) {
    const open = doc.discussions.filter((discussion) => discussion.status === "OPEN");
    if (!open.length) return "Aucun point n'est actuellement en discussion.";
    return open
      .map((discussion) => {
        const last = discussion.comments[discussion.comments.length - 1];
        return `${discussion.title}\n${last ? `${last.author} : ${last.body}` : "Aucun message."}`;
      })
      .join("\n\n");
  }

  if (q.includes("explique") || q.includes("clause") || q.includes("article")) {
    return explainSection(doc, question);
  }

  if (q.includes("incoheren") || q.includes("contradict")) {
    const notes = inconsistencies(doc);
    return notes.length
      ? `J'ai relevé les points suivants. Ce sont des alertes, pas des décisions.\n\n${notes.map((note) => `• ${note}`).join("\n")}`
      : "Je ne vois pas de contradiction évidente entre le texte, les discussions et les propositions en attente.";
  }

  if (q.includes("formulation") || q.includes("plus clair") || q.includes("reformul")) {
    const section = doc.sections.find((item) => item.status === "IN_DISCUSSION") ?? doc.sections[0];
    if (!section) return "Il n'y a pas encore de texte à reformuler.";
    return `Proposition pour « ${section.title} », à accepter ou refuser par le modérateur :\n\nLes parties conviennent expressément de ce qui suit. ${section.content.split("\n").filter(Boolean)[0] ?? ""}`;
  }

  if (q.includes("synthese") || q.includes("directeur")) {
    return [
      `Synthèse — ${doc.title}`,
      `Type : ${doc.typeLabel}. Domaine : ${doc.domain || doc.sector || "non précisé"}.`,
      `Modérateur : ${doc.moderator}.`,
      progressLine,
      doc.parties.length ? `Parties : ${doc.parties.map((party) => party.organization || party.name).join(", ")}.` : "",
      inconsistencies(doc).join(" "),
      "Cette synthèse est une aide à la lecture. Elle ne remplace pas le document validé.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    progressLine,
    `Modérateur : ${doc.moderator}.`,
    inconsistencies(doc).slice(0, 2).join(" "),
    "Vous pouvez me demander ce qui manque, un résumé des modifications, les points en discussion, une explication de clause ou une synthèse.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function assist(question: string, context: AssistantContext) {
  const local = assistLocally(question, context);
  const ai = await complete([
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `Contexte autorisé :\n${JSON.stringify(context)}\n\nQuestion : ${question}\n\nSi le contexte ne suffit pas, dis ce qu'il faut confirmer. N'ajoute pas de faits absents.`,
    },
  ]);
  return ai || local;
}

export async function suggestFormulation(sectionTitle: string, content: string) {
  const local = content.match(/trente \(30\) jours|30 jours/i)
    ? "Les factures sont payables dans les quinze (15) jours de leur réception, sauf le solde de clôture, payable dans les trente (30) jours."
    : `Les parties conviennent de ce qui suit. ${content.split("\n").map((line) => line.trim()).filter(Boolean)[0] ?? sectionTitle}`;

  const ai = await complete([
    {
      role: "system",
      content: `${SYSTEM} Propose une seule formulation de remplacement, plus claire, sans changer les chiffres ni les noms présents. Réponds uniquement avec le texte proposé.`,
    },
    { role: "user", content: `Section : ${sectionTitle}\n\n${content}` },
  ]);
  return ai || local;
}
