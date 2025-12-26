import type {
  AuditLogRepositoryPort,
  CreateAuditLogInput,
} from "@/audit/application/ports/audit-log-repository.port";
import type { AuditLog } from "@/audit/domain/audit-log";
import type { PrismaClient } from "@/generated/prisma/client";

function map(row: any): AuditLog {
  return {
    id: row.id,
    actorType: row.actorType,
    actorUserId: row.actorUserId,
    actorApiKeyId: row.actorApiKeyId,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    ipHash: row.ipHash,
    userAgent: row.userAgent,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

export class PrismaAuditLogRepository implements AuditLogRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const row = await this.prisma.auditLog.create({
      data: {
        actorType: input.actorType,
        actorUserId: input.actorUserId,
        actorApiKeyId: input.actorApiKeyId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        ipHash: input.ipHash,
        userAgent: input.userAgent,
        metadata: input.metadata as any,
      },
    });
    return map(row);
  }
}
