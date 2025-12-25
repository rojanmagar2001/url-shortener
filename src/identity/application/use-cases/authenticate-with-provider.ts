import { err } from "@/shared/errors";
import type { AuthProviderPort } from "@/identity/application/ports/auth-provider.port";
import type { ExternalIdentityRepositoryPort } from "@/identity/application/ports/external-identity-repository.port";
import type { UserRepositoryPort } from "@/identity/application/ports/user-repository.port";
import { normalizeEmail } from "@/identity/domain/user";
import type { TokenServicePort } from "@/identity/application/ports/token-service.port";

export type AuthenticateWithProviderDeps = {
  providers: Map<string, AuthProviderPort>;
  externalIdentities: ExternalIdentityRepositoryPort;
  users: UserRepositoryPort;
  tokens: TokenServicePort;
};

export async function authenticateWithProvider(
  deps: AuthenticateWithProviderDeps,
  args: { provider: string; input: unknown },
): Promise<{
  userId: string;
  tokens: { accessToken: string; refreshToken: string };
}> {
  const provider = deps.providers.get(args.provider);
  if (!provider) {
    throw err("IDENTITY_PROVIDER_NOT_SUPPORTED");
  }

  const external = await provider.authenticate(args.input);

  const existingLink = await deps.externalIdentities.findByProviderIdentity({
    provider: external.provider,
    providerUserId: external.providerUserId,
  });

  if (existingLink) {
    const tokens = await deps.tokens.issueForUser(existingLink.userId);
    return { userId: existingLink.userId, tokens };
  }

  // If no link exists yet:
  // - Prefer matching by email only if email is verified
  // - Otherwise require provider-specific flows later (e.g., ask user to confirm)
  const email = normalizeEmail(external.email);

  let user = external.emailVerified
    ? await deps.users.findByEmail(email)
    : null;

  if (!user) {
    if (!external.emailVerified) {
      throw err("IDENTITY_EMAIL_NOT_VERIFIED");
    }

    // Create new user (passwordHash null for non-local providers)
    user = await deps.users.createUser({
      email,
      passwordHash: "!", // placeholder; will be replaced in Step 6 when createUser supports nullable hash
    });

    // We will fix createUser signature in Step 6 (make passwordHash optional/nullable).
    // For now, we store a sentinel to satisfy schema constraints in Step 5.
  }

  await deps.externalIdentities.createLink({
    userId: user.id,
    externalIdentity: external,
  });

  const tokens = await deps.tokens.issueForUser(user.id);
  return { userId: user.id, tokens };
}
