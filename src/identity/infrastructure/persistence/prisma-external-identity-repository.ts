import type { PrismaClient } from "@/generated/prisma/client";
import type {
  ExternalIdentityRepositoryPort,
  ExternalIdentityLink,
} from "@/identity/application/ports/external-identity-repository.port";

export class PrismaExternalIdentityRepository implements ExternalIdentityRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findByProviderIdentity(args: {
    provider: "local" | "google" | "auth0" | "oidc";
    providerUserId: string;
  }): Promise<ExternalIdentityLink | null> {
    const row = await this.prisma.externalIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: args.provider,
          providerUserId: args.providerUserId,
        },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      provider: row.provider,
      providerUserId: row.providerUserId,
      emailAtLinkTime: row.emailAtLinkTime,
      createdAt: row.createdAt,
    };
  }

  async createLink(args: {
    userId: string;
    externalIdentity: {
      provider: "local" | "google" | "auth0" | "oidc";
      providerUserId: string;
      email: string;
      rawClaims: Record<string, unknown>;
    };
  }): Promise<ExternalIdentityLink> {
    const row = await this.prisma.externalIdentity.create({
      data: {
        userId: args.userId,
        provider: args.externalIdentity.provider,
        providerUserId: args.externalIdentity.providerUserId,
        emailAtLinkTime: args.externalIdentity.email,
        createdAt: new Date(),
      },
    });

    return {
      id: row.id,
      userId: row.userId,
      provider: row.provider,
      providerUserId: row.providerUserId,
      emailAtLinkTime: row.emailAtLinkTime,
      createdAt: row.createdAt,
    };
  }
}
