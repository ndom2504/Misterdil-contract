export type User = {
  id: string;
  email: string;
  name: string;
  phone: string;
  jobTitle: string;
  profileType: string;
  onboarded: boolean;
  avatarUrl: string;
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

export type WorkspaceSummary = {
  id: string;
  name: string;
  description: string;
  sector: string;
  role: string;
  participants: number;
  documents: number;
  progress: Progress;
  canDelete: boolean;
  updatedAt: string;
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
  canManage?: boolean;
  color?: string;
};

export type SectionPerson = { id: string; name: string; avatarUrl: string };

export type SectionSocial = {
  likes: number;
  liked: boolean;
  views: number;
  comments: number;
  people: SectionPerson[];
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
  color?: string;
  social?: SectionSocial;
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
  avatarUrl?: string;
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

export type Approval = {
  id: string;
  userId: string;
  name: string;
  roleLabel: string;
  status: string;
  decidedAt: string | null;
};

export type Signature = {
  id: string;
  stakeholderId: string;
  name: string;
  organization: string;
  partyType: string;
  status: string;
  signerName: string;
  signerEmail: string;
  signedAt: string | null;
  method: string;
  canSign: boolean;
};

export type FileItem = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedByName?: string;
};

export type FileGroup = {
  id: string;
  title: string;
  typeLabel: string;
  status: string;
  workspaceId: string;
  canUpload: boolean;
  files: FileItem[];
};

export type Conversation = {
  documentId: string;
  title: string;
  typeLabel: string;
  status: string;
  color?: string;
  participants: number;
  canManage?: boolean;
  lastMessage: { authorName: string; body: string; kind: string; createdAt: string } | null;
  updatedAt: string;
};

export type ChatFile = { name: string; type: string; size: number; url: string };

export type ChatMessage = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorAvatar: string;
  body: string;
  kind: string;
  file?: ChatFile | null;
  createdAt: string;
};

export type ReactionSummary = { emoji: string; count: number; userIds: string[]; names: string[] };

export type AssistantMessage = { id: string; role: string; content: string; createdAt: string };

export type CallStatus = {
  configured: boolean;
  active: boolean;
  participants: { id: string; name: string }[];
};

export type DocumentView = {
  id: string;
  title: string;
  typeLabel: string;
  status: string;
  color?: string;
  workspaceId: string;
  workspaceName: string;
  moderatorId: string | null;
  moderatorName: string;
  moderatorAvatar?: string;
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
  readyForFinal: boolean;
  partiesApproved: boolean;
  approvals: Approval[];
  signatures: Signature[];
  attachments: FileItem[];
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
  avatarUrl?: string;
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
