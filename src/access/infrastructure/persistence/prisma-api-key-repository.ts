import type { ApiKeyRepositoryPort } from "@/access/application/ports/api-key-repository.port";
import type { ApiKey } from "@/access/domain/api-key";
import type { PrismaClient } from "@/generated/prisma/client";

function mapApiKey(row: any): ApiKey {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    keyHash: row.keyHash,
    scopes: row.scopes,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    lastUsedAt: row.lastUsedAt,
  };
}

export class PrismaApiKeyRepository implements ApiKeyRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    userId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    scopes: string[];
    expiresAt: Date | null;
  }): Promise<ApiKey> {
    const row = await this.prisma.apiKey.create({
      data: {
        userId: input.userId,
        name: input.name,
        keyPrefix: input.keyPrefix,
        keyHash: input.keyHash,
        scopes: input.scopes,
        expiresAt: input.expiresAt,
      },
    });
    return mapApiKey(row);
  }

  async findByPrefix(prefix: string): Promise<ApiKey | null> {
    const row = await this.prisma.apiKey.findFirst({
      where: { keyPrefix: prefix },
    });
    return row ? mapApiKey(row) : null;
  }

  async touchLastUsed(id: string, at: Date): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: at },
    });
  }
}
