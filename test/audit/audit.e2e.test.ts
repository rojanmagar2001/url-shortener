import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  startInfra,
  stopInfra,
  type StartedInfra,
} from "@/../test/integration/infra";
import { createApp } from "@/app";
import { createPrismaClient } from "@/shared/db/prisma";

describe("audit logs (e2e)", () => {
  let infra: StartedInfra;

  beforeAll(async () => {
    infra = await startInfra();
  });

  afterAll(async () => {
    await stopInfra(infra);
  });

  it("writes audit logs for register and api key creation", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    const email = "aud@example.com";
    const password = "verylongandsecurepassword";

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password },
    });
    expect(regRes.statusCode).toBe(201);
    const reg = regRes.json();

    const createKeyRes = await app.inject({
      method: "POST",
      url: "/settings/api-keys",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      payload: { name: "svc", scopes: ["links:write"], expiresAt: null },
    });
    expect(createKeyRes.statusCode).toBe(201);

    const prisma = createPrismaClient(infra.databaseUrl);
    await prisma.$connect();

    const logs = await prisma.auditLog.findMany({
      where: { actorUserId: reg.userId },
      orderBy: { createdAt: "asc" },
    });

    await prisma.$disconnect();
    await app.close();

    const actions = logs.map((l) => l.action);
    expect(actions).toContain("identity.register");
    expect(actions).toContain("access.api-key.create");
  });
});
