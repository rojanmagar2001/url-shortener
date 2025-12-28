export type AuditEvent = {
  eventId: string;
  occurredAt: string; // ISO

  actorType: "user" | "api_key" | "system";
  actorUserId: string | null;
  actorApiKeyId: string | null;

  action: string;
  resourceType: string;
  resourceId: string | null;

  ipHash: string | null;
  userAgent: string | null;

  metadata: Record<string, unknown>;
};
