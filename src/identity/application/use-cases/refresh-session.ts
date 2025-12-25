import { err } from "@/shared/errors";
import type { SessionRepositoryPort } from "@/identity/application/ports/session-repository.port";
import type { TokenServicePort } from "@/identity/application/ports/token-service.port";
import { sha256Hex, safeEqual } from "@/shared/crypto/hashing";

export type RefreshSessionDeps = {
  sessions: SessionRepositoryPort;
  tokens: TokenServicePort;
};

export async function refreshSession(
  deps: RefreshSessionDeps,
  input: { refreshToken: string },
): Promise<{
  userId: string;
  tokens: { accessToken: string; refreshToken: string };
}> {
  const parts = input.refreshToken.split(".");
  if (parts.length !== 2) throw err("SESSION_INVALID");

  const [sessionId, secret] = parts;
  if (!sessionId || !secret) throw err("SESSION_INVALID");

  const session = await deps.sessions.findById(sessionId);
  if (!session) throw err("SESSION_INVALID");
  if (session.revokedAt) throw err("SESSION_REVOKED");
  if (session.expiresAt.getTime() <= Date.now()) throw err("SESSION_EXPIRED");

  const presentedHash = sha256Hex(secret);
  if (!safeEqual(presentedHash, session.refreshTokenHash)) {
    // Treat as invalid; do not reveal which part was wrong.
    throw err("SESSION_INVALID");
  }

  // Rotate: revoke old session, issue new tokens (creates new session)
  await deps.sessions.revokeSession(session.id, new Date());

  const tokens = await deps.tokens.issueForUser(session.userId);
  return { userId: session.userId, tokens };
}
