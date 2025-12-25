export type AuthProviderName = "local" | "google" | "auth0" | "oidc";

export type ExternalIdentity = Readonly<{
  provider: AuthProviderName;
  providerUserId: string; // normalized "sub"
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
  rawClaims: Record<string, unknown>;
}>;
