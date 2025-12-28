import type { PrismaClient } from "@/generated/prisma/client";
import type {
  LinkRepositoryPort,
  CreateLinkInput,
} from "@/links/application/ports/link-repository.port";
import type { Link } from "@/links/domain/link";

function map(row: any): Link {
  return {
    id: row.id,
    userId: row.userId,
    code: row.code,
    originalUrl: row.originalUrl,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    customAlias: row.customAlias,
    isActive: row.isActive,
    createdByIpHash: row.createdByIpHash,
  };
}

export class PrismaLinkRepository implements LinkRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateLinkInput): Promise<Link> {
    const row = await this.prisma.link.create({
      data: {
        userId: input.userId,
        code: input.code,
        originalUrl: input.originalUrl,
        expiresAt: input.expiresAt,
        customAlias: input.customAlias,
        isActive: input.isActive,
        createdByIpHash: input.createdByIpHash,
      },
    });
    return map(row);
  }

  async findByCode(code: string): Promise<Link | null> {
    const row = await this.prisma.link.findUnique({ where: { code } });
    return row ? map(row) : null;
  }

  async findById(id: string): Promise<Link | null> {
    const row = await this.prisma.link.findUnique({ where: { id } });
    return row ? map(row) : null;
  }
}
