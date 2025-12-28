import type { Link } from "@/links/domain/link";

export type CreateLinkInput = {
  userId: string;
  code: string;
  originalUrl: string;
  expiresAt: Date | null;
  customAlias: string | null;
  isActive: boolean;
  createdByIpHash: string | null;
};

export type LinkRepositoryPort = {
  create(input: CreateLinkInput): Promise<Link>;
  findByCode(code: string): Promise<Link | null>;
  findById(id: string): Promise<Link | null>;
};
