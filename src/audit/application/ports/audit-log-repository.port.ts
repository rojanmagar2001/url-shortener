import type { AuditLog, AuditActorType } from "@/audit/domain/audit-log";

export type CreateAuditLogInput = {
  actorType: AuditActorType;
  actorUserId: string | null;
  actorApiKeyId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
};

export type AuditLogRepositoryPort = {
  create(input: CreateAuditLogInput): Promise<AuditLog>;
};
