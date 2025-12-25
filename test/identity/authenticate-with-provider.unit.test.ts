import { describe, expect, it } from "vitest";
import { authenticateWithProvider } from "@/identity/application/use-cases/authenticate-with-provider";
import type { AuthProviderPort } from "@/identity/application/ports/auth-provider.port";
import type { ExternalIdentityRepositoryPort } from "@/identity/application/ports/external-identity-repository.port";
import type { UserRepositoryPort } from "@/identity/application/ports/user-repository.port";
import type { TokenServicePort } from "@/identity/application/ports/token-service.port";

describe("authenticateWithProvider (unit)", () => {
  it("creates link when none exists and email verified", async () => {
    const provider: AuthProviderPort = {
      name: "local",
      async authenticate() {
        return {
          provider: "local",
          providerUserId: "sub1",
          email: "a@b.com",
          emailVerified: true,
          rawClaims: {},
        };
      },
    };

    const externalIdentities: ExternalIdentityRepositoryPort = {
      async findByProviderIdentity() {
        return null;
      },
      async createLink(args) {
        return {
          id: "eid1",
          userId: args.userId,
          provider: args.externalIdentity.provider,
          providerUserId: args.externalIdentity.providerUserId,
          emailAtLinkTime: args.externalIdentity.email,
          createdAt: new Date(),
        };
      },
    };

    const users: UserRepositoryPort = {
      async findByEmail() {
        return null;
      },
      async createUser(input) {
        return {
          id: "u1",
          email: input.email,
          role: "user",
          passwordHash: input.passwordHash,
          disabledAt: null,
          createdAt: new Date(),
        };
      },
      async findById() {
        return null;
      },
    };

    const tokens: TokenServicePort = {
      async issueForUser(userId) {
        return { accessToken: `a-${userId}`, refreshToken: `r-${userId}` };
      },
      async verifyAccessToken() {
        throw new Error("Not Implemented");
      },
    };

    const providers = new Map<string, AuthProviderPort>([["local", provider]]);

    const res = await authenticateWithProvider(
      { providers, externalIdentities, users, tokens },
      { provider: "local", input: {} },
    );

    expect(res.userId).toBe("u1");
    expect(res.tokens.accessToken).toBe("a-u1");
  });
});
