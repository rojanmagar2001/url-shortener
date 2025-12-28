export type LinkSummary = {
  linkId: string;
  clicksTotal: number;
  clicksLast24h: number;
};

export type TopLinkRow = {
  linkId: string;
  code: string;
  clicks: number;
};

export type AnalyticsReaderPort = {
  getLinkSummary(linkId: string): Promise<LinkSummary>;
  getTopLinks(minutes: number, limit: number): Promise<TopLinkRow[]>;
};
