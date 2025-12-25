import { AppError } from "@/shared/errors";
import type { AuthProviderPort } from "@/identity/application/ports/auth-provider.port";
import type { ExternalIdentity } from "@/identity/domain/external-identity";
import { normalizeEmail } from "@/identity/domain/user";
import type { UserRepositoryPort } from "@/identity/application/ports/user-repository.port";
import type { PasswordHasherPort } from "@/identity/application/ports/password-hasher.port";

export type LocalPasswordAuthInput = {
  email: string;
  password: string;
};

export class LocalPasswordAuthProvider implements AuthProviderPort {
  public readonly name = "local" as const;

  constructor(
    private readonly users: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async authenticate(input: unknown): Promise<ExternalIdentity> {
    if (
      typeof input !== "object" ||
      input === null ||
      !("email" in input) ||
      !("password" in input)
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        statusCode: 400,
      });
    }

    const email = normalizeEmail(String((input as any).email));
    const password = String((input as any).password);

    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new AppError({
        code: "IDENTITY_INVALID_CREDENTIALS",
        message: "Invalid credentials",
        statusCode: 401,
      });
    }

    if (user.disabledAt) {
      throw new AppError({
        code: "IDENTITY_USER_DISABLED",
        message: "User is disabled",
        statusCode: 403,
      });
    }

    const ok = await this.passwordHasher.verify(password, user.passwordHash);
    if (!ok) {
      throw new AppError({
        code: "IDENTITY_INVALID_CREDENTIALS",
        message: "Invalid credentials",
        statusCode: 401,
      });
    }

    // providerUserId must be stable and unique per provider.
    // For local, we use the internal user id.
    return {
      provider: "local",
      providerUserId: user.id,
      email: user.email,
      emailVerified: true,
      rawClaims: { email: user.email },
    };
  }
}
