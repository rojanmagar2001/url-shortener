export type Link = Readonly<{
  id: string;
  userId: string;
  code: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
  customAlias: string | null;
  isActive: boolean;
  createdByIpHash: string | null;
}>;
