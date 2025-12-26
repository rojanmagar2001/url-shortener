import { describe, expect, it } from "vitest";
import { registerWithPassword } from "@/identity/application/use-cases/register-with-password";
import type { UserRepositoryPort } from "@/identity/application/ports/user-repository.port";
import type { PasswordHasherPort } from "@/identity/application/ports/password-hasher.port";
import type { TokenServicePort } from "@/identity/application/ports/token-service.port";

describe("registerWithPassword (unit)", () => {
  it("creates user and returns tokens", async () => {
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

      async setRole() {},
    };

    const passwordHasher: PasswordHasherPort = {
      async hash() {
        return "hash";
      },
      async verify() {
        return true;
      },
    };

    const tokens: TokenServicePort = {
      async issueForUser() {
        return { accessToken: "a", refreshToken: "r" };
      },
      async verifyAccessToken() {
        throw new Error();
      },
    };

    const res = await registerWithPassword(
      { users, passwordHasher, tokens },
      { email: "Alice@Example.com", password: "supersecurepassword" },
    );

    expect(res.userId).toBe("u1");
    expect(res.tokens.accessToken).toBe("a");
  });
});
