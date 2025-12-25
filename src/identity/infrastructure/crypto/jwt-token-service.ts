import { SignJWT, jwtVerify } from "jose";
import type {
  TokenPair,
  TokenServicePort,
  VerifiedAccess,
} from "@/identity/application/ports/token-service.port";
import type { SessionRepositoryPort } from "@/identity/application/ports/session-repository.port";
import { randomToken } from "./node-crypto";
import { sha256Hex } from "@/shared/crypto/hashing";
import type { AppConfig } from "@/shared/config/schema";

export class JwtTokenService implements TokenServicePort {
  private readonly key: Uint8Array;

  constructor(
    private readonly cfg: AppConfig["jwt"],
    private readonly sessions: SessionRepositoryPort,
  ) {
    this.key = new TextEncoder().encode(cfg.secret);
  }

  async issueForUser(userId: string): Promise<TokenPair> {
    // Refresh token is a random secret; we store only a hash.
    const refreshToken = randomToken(32);
    const refreshTokenHash = sha256Hex(refreshToken);

    // Session expires later than access token; keep simple for now: 30 days.
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const session = await this.sessions.createSession({
      userId,
      refreshTokenHash,
      expiresAt,
    });

    const accessToken = await new SignJWT({ sid: session.id } satisfies {
      sid: string;
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(this.cfg.issuer)
      .setAudience(this.cfg.audience)
      .setSubject(userId)
      .setExpirationTime(`${this.cfg.accessTtlSeconds}s`)
      .setIssuedAt()
      .sign(this.key);

    // We embed the session id in the refresh token so we can lookup quickly.
    // Format: <sessionId>.<secret>
    return {
      accessToken,
      refreshToken: `${session.id}.${refreshToken}`,
    };
  }

  async verifyAccessToken(token: string): Promise<VerifiedAccess> {
    const { payload } = await jwtVerify(token, this.key, {
      issuer: this.cfg.issuer,
      audience: this.cfg.audience,
    });

    const userId = payload.sub;
    const sessionId = (payload as Record<string, unknown>)["sid"];

    if (typeof userId !== "string" || typeof sessionId !== "string") {
      throw new Error("Invalid token payload");
    }

    return { userId, sessionId };
  }
}
