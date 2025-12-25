import type {
  ExternalIdentity,
  AuthProviderName,
} from "@/identity/domain/external-identity";

export type AuthProviderPort = {
  name: AuthProviderName;
  authenticate(input: unknown): Promise<ExternalIdentity>;
};
