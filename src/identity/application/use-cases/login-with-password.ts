import { AppError } from "@/shared/errors";
import { normalizeEmail } from "@/identity/domain/user";
import type { PasswordHasherPort } from "@/identity/application/ports/password-hasher.port";
import type { TokenServicePort } from "@/identity/application/ports/token-service.port";
import type { UserRepositoryPort } from "@/identity/application/ports/user-repository.port";

export type LoginWithPasswordInput = {
  email: string;
  password: string;
};

export type LoginWithPasswordDeps = {
  users: UserRepositoryPort;
  passwordHasher: PasswordHasherPort;
  tokens: TokenServicePort;
};

export async function loginWithPassword(
  deps: LoginWithPasswordDeps,
  input: LoginWithPasswordInput,
): Promise<{
  userId: string;
  tokens: { accessToken: string; refreshToken: string };
}> {
  const email = normalizeEmail(input.email);

  const user = await deps.users.findByEmail(email);
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

  const ok = await deps.passwordHasher.verify(
    input.password,
    user.passwordHash,
  );
  if (!ok) {
    throw new AppError({
      code: "IDENTITY_INVALID_CREDENTIALS",
      message: "Invalid credentials",
      statusCode: 401,
    });
  }

  const tokens = await deps.tokens.issueForUser(user.id);
  return { userId: user.id, tokens };
}
