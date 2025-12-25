import type { PrismaClient } from "@/generated/prisma/client";
import type {
  Session,
  SessionRepositoryPort,
} from "@/identity/application/ports/session-repository.port";

function mapSession(row: {
  id: string;
  userId: string;
  refreshTokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}): Session {
  return {
    id: row.id,
    userId: row.userId,
    refreshTokenHash: row.refreshTokenHash,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  };
}

export class PrismaSessionRepository implements SessionRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async createSession(args: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Promise<Session> {
    const row = await this.prisma.session.create({
      data: {
        userId: args.userId,
        refreshTokenHash: args.refreshTokenHash,
        expiresAt: args.expiresAt,
      },
    });
    return mapSession(row);
  }

  async findById(id: string): Promise<Session | null> {
    const row = await this.prisma.session.findUnique({ where: { id } });
    return row ? mapSession(row) : null;
  }

  async revokeSession(id: string, revokedAt: Date): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { revokedAt },
    });
  }
}
