export type LinkClickedEvent = {
  eventId: string;
  linkId: string;
  code: string;
  clickedAt: string; // ISO
  referrer: string | null;
  userAgent: string | null;
  ipHash: string | null;
};
