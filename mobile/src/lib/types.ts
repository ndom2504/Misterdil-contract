export type User = {
  id: string;
  email: string;
  name: string;
  phone: string;
  jobTitle: string;
  profileType: string;
  onboarded: boolean;
  organization: { id: string; name: string; sector: string; kind: string; address: string; phone: string } | null;
};

export type Me = {
  user: User;
  unread: number;
  microsoftEmail: string;
  sectors: { id: string; label: string }[];
};

export type Progress = {
  total: number;
  validated: number;
  discussion: number;
  todo: number;
  percent: number;
};

export type DocumentSummary = {
  id: string;
  title: string;
  typeLabel: string;
  status: string;
  updatedAt: string;
  workspaceName: string;
  moderatorName: string;
  participants: number;
  progress: Progress;
  owned: boolean;
};

export type Section = {
  id: string;
  anchor: string;
  title: string;
  content: string;
  status: string;
  position: number;
  updatedAt: string;
  updatedById: string | null;
  updatedByName: string;
};

export type Stakeholder = {
  id: string;
  userId: string | null;
  name: string;
  organization: string;
  partyType: string;
  email: string;
  phone: string;
  representative: string;
  jobTitle: string;
  address: string;
  accessRole: string;
  invitedAt: string | null;
  isCurrentUser: boolean;
};

export type Discussion = {
  id: string;
  sectionId: string | null;
  title: string;
  status: string;
  createdAt: string;
  comments: { id: string; authorName: string; body: string; isAi: boolean; createdAt: string }[];
};

export type InvitationLink = { email: string; link: string; emailed: boolean };

export type DocumentView = {
  id: string;
  title: string;
  typeLabel: string;
  status: string;
  workspaceName: string;
  moderatorId: string | null;
  moderatorName: string;
  currentUserId: string;
  loadedAt: string;
  sentAt: string | null;
  progress: Progress;
  access: {
    canEdit: boolean;
    canWrite: boolean;
    canComment: boolean;
    canPropose: boolean;
    canValidate: boolean;
    canLock: boolean;
    canInvite: boolean;
    isModerator: boolean;
    documentRole: string;
  };
  sections: Section[];
  stakeholders: Stakeholder[];
  invitationLinks: InvitationLink[];
  discussions: Discussion[];
  activities: { id: string; kind: string; actorName: string; message: string; createdAt: string }[];
};

export type SyncSection = {
  id: string;
  content: string;
  status: string;
  updatedAt: string;
  updatedById: string | null;
  updatedByName: string;
};

export type PresenceEntry = {
  userId: string;
  name: string;
  organization: string;
  jobTitle: string;
  sectionId: string | null;
  lastSeenAt: string;
  online: boolean;
};

export type SyncPayload = {
  now: string;
  signal: string;
  presence: PresenceEntry[];
  sections: SyncSection[];
};

export type ShareResult = {
  name: string;
  email: string;
  status: 'notified' | 'emailed' | 'link';
  link: string;
};

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export type PartyInput = {
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

export type Catalog = {
  types: { id: string; label: string; description: string }[];
  partyTypes: { id: string; label: string }[];
  accessRoles: { id: string; label: string }[];
  workspaces: { id: string; name: string }[];
};

export type PersonMatch = {
  id: string;
  name: string;
  email: string;
  organization: string;
  jobTitle: string;
  phone: string;
  inNetwork: boolean;
};

export type InvitationPreview = {
  status: string;
  email: string;
  inviterName: string;
  inviterOrganization: string;
  workspaceName: string;
  title: string;
  typeLabel: string;
  parties: { name: string; organization: string; partyType: string }[];
};
