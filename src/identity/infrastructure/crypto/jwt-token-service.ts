import { SignJWT, jwtVerify } from "jose";
import type {
  TokenPair,
  TokenServicePort,
  VerifiedAccess,
} from "@/identity/application/ports/token-service.port";
import type { SessionRepositoryPort } from "@/identity/application/ports/session-repository.port";
import type { UserRepositoryPort } from "@/identity/application/ports/user-repository.port";
import { randomToken } from "./node-crypto";
import { sha256Hex } from "@/shared/crypto/hashing";
import type { AppConfig } from "@/shared/config/schema";

export class JwtTokenService implements TokenServicePort {
  private readonly key: Uint8Array;

  constructor(
    private readonly cfg: AppConfig["jwt"],
    private readonly sessions: SessionRepositoryPort,
    private readonly users: UserRepositoryPort,
  ) {
    this.key = new TextEncoder().encode(cfg.secret);
  }

  async issueForUser(userId: string): Promise<TokenPair> {
    const user = await this.users.findById(userId);
    if (!user) throw new Error("User not found");

    const refreshToken = randomToken(32);
    const refreshTokenHash = sha256Hex(refreshToken);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const session = await this.sessions.createSession({
      userId,
      refreshTokenHash,
      expiresAt,
    });

    const accessToken = await new SignJWT({ sid: session.id, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(this.cfg.issuer)
      .setAudience(this.cfg.audience)
      .setSubject(userId)
      .setExpirationTime(`${this.cfg.accessTtlSeconds}s`)
      .setIssuedAt()
      .sign(this.key);

    return { accessToken, refreshToken: `${session.id}.${refreshToken}` };
  }

  async verifyAccessToken(token: string): Promise<VerifiedAccess> {
    const { payload } = await jwtVerify(token, this.key, {
      issuer: this.cfg.issuer,
      audience: this.cfg.audience,
    });

    const userId = payload.sub;
    const sessionId = (payload as Record<string, unknown>)["sid"];
    const role = (payload as Record<string, unknown>)["role"];

    if (typeof userId !== "string" || typeof sessionId !== "string") {
      throw new Error("Invalid token payload");
    }
    if (role !== "user" && role !== "admin") {
      throw new Error("Invalid role");
    }

    return { userId, sessionId, role };
  }
}
