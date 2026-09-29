export const SYNC_INTERVAL_MS = 3500;
export const ONLINE_WINDOW_MS = 20_000;

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
