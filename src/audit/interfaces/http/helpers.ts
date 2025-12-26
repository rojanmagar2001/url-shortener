import type { FastifyRequest } from "fastify";
import { sha256Hex } from "@/shared/crypto/hashing";
import "@/identity/interfaces/http/auth-context";

export function ipHashOf(req: FastifyRequest): string | null {
  const ip = req.ip;
  if (!ip) return null;
  // Hash only; do not store raw IP.
  return sha256Hex(ip);
}

export function userAgentOf(req: FastifyRequest): string | null {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : null;
}

export function actorFromAuth(req: FastifyRequest): {
  actorType: "user" | "api_key" | "system";
  actorUserId: string | null;
  actorApiKeyId: string | null;
} {
  const auth = (req as any).auth;

  if (auth?.kind === "user") {
    return { actorType: "user", actorUserId: auth.userId, actorApiKeyId: null };
  }
  if (auth?.kind === "api_key") {
    return {
      actorType: "api_key",
      actorUserId: auth.userId,
      actorApiKeyId: auth.apiKeyId,
    };
  }
  return { actorType: "system", actorUserId: null, actorApiKeyId: null };
}
