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
