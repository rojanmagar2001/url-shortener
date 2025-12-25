import { AppError } from "@/shared/errors";
import { normalizeEmail } from "@/identity/domain/user";
import type { PasswordHasherPort } from "@/identity/application/ports/password-hasher.port";
import type { TokenServicePort } from "@/identity/application/ports/token-service.port";
import type { UserRepositoryPort } from "@/identity/application/ports/user-repository.port";

export type RegisterWithPasswordInput = {
  email: string;
  password: string;
};

export type RegisterWithPasswordDeps = {
  users: UserRepositoryPort;
  passwordHasher: PasswordHasherPort;
  tokens: TokenServicePort;
};

export async function registerWithPassword(
  deps: RegisterWithPasswordDeps,
  input: RegisterWithPasswordInput,
): Promise<{
  userId: string;
  tokens: { accessToken: string; refreshToken: string };
}> {
  const email = normalizeEmail(input.email);

  const existing = await deps.users.findByEmail(email);
  if (existing) {
    throw new AppError({
      code: "IDENTITY_EMAIL_TAKEN",
      message: "Email is already registered",
      statusCode: 409,
    });
  }

  const passwordHash = await deps.passwordHasher.hash(input.password);
  const user = await deps.users.createUser({ email, passwordHash });

  const tokens = await deps.tokens.issueForUser(user.id);

  return { userId: user.id, tokens };
}
