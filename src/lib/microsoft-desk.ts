export const MICROSOFT_NOTICES: Record<string, string> = {
  ok: "Microsoft est connecté. Vos courriels et vos réunions se lisent ici.",
  "compte-inconnu": "Ce compte Microsoft ne fournit aucune adresse courriel. Utilisez un autre compte ou votre mot de passe Misterdil.",
  "connexion-annulee": "La connexion Microsoft a été annulée.",
  "connexion-interrompue": "La connexion Microsoft a été interrompue. Relancez-la depuis cette page.",
  "connexion-refusee": "Microsoft a refusé la connexion. Relancez-la ; si le problème persiste, vérifiez l'adresse de retour dans Entra.",
  "consentement-admin": "L'administrateur Microsoft de votre organisation doit d'abord approuver Misterdil.",
  configuration: "Les clés Microsoft ne sont pas disponibles sur le serveur.",
};

export type MailWindow = {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
  clock: string;
  preview: string;
  body: string;
  unread: boolean;
  important: boolean;
  category: string;
  at: string;
};

export type MeetingWindow = {
  id: string;
  subject: string;
  when: string;
  day: string;
  time: string;
  organizer: string;
  attendees: number;
  joinUrl: string;
  past: boolean;
  at: string;
};
