import type { ApiKey } from "@/access/domain/api-key";

export type CreateApiKeyRecordInput = {
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt: Date | null;
};

export type ApiKeyRepositoryPort = {
  create(input: CreateApiKeyRecordInput): Promise<ApiKey>;
  findByPrefix(prefix: string): Promise<ApiKey | null>;
  touchLastUsed(id: string, at: Date): Promise<void>;
};
