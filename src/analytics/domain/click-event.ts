export type ClickEvent = Readonly<{
  eventId: string;
  linkId: string;
  code: string;
  clickedAt: Date;
  referrer: string | null;
  userAgent: string | null;
  ipHash: string | null;
  country: string | null;
}>;
