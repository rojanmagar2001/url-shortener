import { describe, expect, it } from "vitest";
import { JwtTokenService } from "@/identity/infrastructure/crypto/jwt-token-service";
import type { SessionRepositoryPort } from "@/identity/application/ports/session-repository.port";
import type { UserRepositoryPort } from "@/identity/application/ports/user-repository.port";

describe("JwtTokenService", () => {
  it("issues and verifies access token", async () => {
    const users: UserRepositoryPort = {
      async findById(id: string): Promise<any> {
        return {
          id,
          email: "test@example.com",
          role: "user",
          passwordHash: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
      async findByEmail() {
        return null;
      },
      async createUser() {
        throw new Error("Not implemented in test");
      },
      async setRole() {},
    };

    const sessions: SessionRepositoryPort = {
      async createSession() {
        return {
          id: "s1",
          userId: "u1",
          refreshTokenHash: "h",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 1000),
          revokedAt: null,
        };
      },
      async findById() {
        return null;
      },
      async revokeSession() {},
    };

    const svc = new JwtTokenService(
      {
        issuer: "iss",
        audience: "aud",
        accessTtlSeconds: 900,
        secret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      sessions,
      users, // Add the users repository
    );

    const pair = await svc.issueForUser("u1");
    const verified = await svc.verifyAccessToken(pair.accessToken);
    expect(verified.userId).toBe("u1");
    expect(verified.sessionId).toBe("s1");
  });
});
