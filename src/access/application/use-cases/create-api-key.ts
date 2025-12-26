import { randomBytes } from "node:crypto";
import { sha256Hex } from "@/shared/crypto/hashing";
import type { ApiKeyRepositoryPort } from "@/access/application/ports/api-key-repository.port";

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

export type CreateApiKeyInput = {
  userId: string;
  name: string;
  scopes: string[];
  expiresAt: Date | null;
};

export async function createApiKey(
  deps: { repo: ApiKeyRepositoryPort },
  input: CreateApiKeyInput,
): Promise<{ apiKeyId: string; apiKey: string; keyPrefix: string }> {
  // Prefix is short and indexed; secret is long.
  const keyPrefix = randomHex(4); // 8 hex chars
  const secret = randomHex(32); // 64 hex chars

  const apiKey = `${keyPrefix}.${secret}`;
  const keyHash = sha256Hex(secret);

  const record = await deps.repo.create({
    userId: input.userId,
    name: input.name,
    keyPrefix,
    keyHash,
    scopes: input.scopes,
    expiresAt: input.expiresAt,
  });

  // Secret is returned ONCE (caller must show it now).
  return { apiKeyId: record.id, apiKey, keyPrefix };
}
