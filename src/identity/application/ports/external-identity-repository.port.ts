import type {
  AuthProviderName,
  ExternalIdentity,
} from "@/identity/domain/external-identity";

export type ExternalIdentityLink = {
  id: string;
  userId: string;
  provider: AuthProviderName;
  providerUserId: string;
  emailAtLinkTime: string;
  createdAt: Date;
};

export type ExternalIdentityRepositoryPort = {
  findByProviderIdentity(args: {
    provider: AuthProviderName;
    providerUserId: string;
  }): Promise<ExternalIdentityLink | null>;

  createLink(args: {
    userId: string;
    externalIdentity: ExternalIdentity;
  }): Promise<ExternalIdentityLink>;
};
