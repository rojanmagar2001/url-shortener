import { randomBytes } from "node:crypto";
import { err } from "@/shared/errors";
import type { LinkRepositoryPort } from "@/links/application/ports/link-repository.port";
import { validateOriginalUrl } from "@/links/domain/url";

const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomCode(length = 7): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export type CreateLinkDeps = {
  links: LinkRepositoryPort;
};

export type CreateLinkInput = {
  userId: string;
  originalUrl: string;
  customAlias: string | null;
  expiresAt: Date | null;
  createdByIpHash: string | null;
};

export async function createLink(
  deps: CreateLinkDeps,
  input: CreateLinkInput,
): Promise<{ linkId: string; code: string; originalUrl: string }> {
  const originalUrl = validateOriginalUrl(input.originalUrl);

  if (input.customAlias) {
    // Keep alias rules tight early; expand later.
    const alias = input.customAlias.trim();
    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(alias)) {
      throw err("VALIDATION_ERROR", {
        details: { field: "customAlias", reason: "invalid_alias" },
      });
    }

    const existing = await deps.links.findByCode(alias);
    if (existing) {
      throw err("VALIDATION_ERROR", {
        details: { field: "customAlias", reason: "alias_taken" },
      });
    }

    const created = await deps.links.create({
      userId: input.userId,
      code: alias,
      originalUrl,
      expiresAt: input.expiresAt,
      customAlias: alias,
      isActive: true,
      createdByIpHash: input.createdByIpHash,
    });

    return {
      linkId: created.id,
      code: created.code,
      originalUrl: created.originalUrl,
    };
  }

  // Auto code generation with small retry loop.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(7);
    const existing = await deps.links.findByCode(code);
    if (existing) continue;

    const created = await deps.links.create({
      userId: input.userId,
      code,
      originalUrl,
      expiresAt: input.expiresAt,
      customAlias: null,
      isActive: true,
      createdByIpHash: input.createdByIpHash,
    });

    return {
      linkId: created.id,
      code: created.code,
      originalUrl: created.originalUrl,
    };
  }

  throw err("INTERNAL_ERROR", { message: "Failed to allocate link code" });
}
