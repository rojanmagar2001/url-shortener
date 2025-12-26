export type AuditActorType = "user" | "api_key" | "system";

export type AuditLog = Readonly<{
  id: string;
  actorType: AuditActorType;
  actorUserId: string | null;
  actorApiKeyId: string | null;

  action: string;
  resourceType: string;
  resourceId: string | null;

  ipHash: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;

  createdAt: Date;
}>;
