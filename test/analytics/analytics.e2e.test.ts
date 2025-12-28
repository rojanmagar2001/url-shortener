import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  startInfra,
  stopInfra,
  type StartedInfra,
} from "@/../test/integration/infra.js";
import { createApp } from "@/app.js";
import { ensureTimescaleSchema } from "@/analytics/infrastructure/timescale/schema.js";
import { Client } from "pg";
import { createPrismaClient } from "@/shared/db/prisma.js";
import { PrismaUserRepository } from "@/identity/infrastructure/persistence/prisma-user-repository.js";

describe("analytics API (e2e)", () => {
  let infra: StartedInfra;

  beforeAll(async () => {
    infra = await startInfra();
    await ensureTimescaleSchema(infra.analyticsUrl);
  });

  afterAll(async () => {
    await stopInfra(infra);
  });

  it("returns link summary for owner", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
      analytics: { enabled: true, databaseUrl: infra.analyticsUrl },
    });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "an1@example.com",
        password: "verylongandsecurepassword",
      },
    });
    const reg = regRes.json();

    const linkRes = await app.inject({
      method: "POST",
      url: "/api/links",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      payload: {
        originalUrl: "https://example.com/an",
        customAlias: "an12345",
        expiresAt: null,
      },
    });
    const link = linkRes.json();

    // Insert click into Timescale
    const client = new Client({ connectionString: infra.analyticsUrl });
    await client.connect();
    await client.query(
      `INSERT INTO click_events(event_id, link_id, code, clicked_at, referrer, user_agent, ip_hash, country)
       VALUES ($1,$2,$3,now(),$4,$5,$6,$7)
       ON CONFLICT (event_id) DO NOTHING`,
      ["evt-ana-1", link.linkId, link.code, null, null, null, null],
    );
    await client.end();

    const summaryRes = await app.inject({
      method: "GET",
      url: `/api/analytics/links/${link.linkId}/summary`,
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
    });

    expect(summaryRes.statusCode).toBe(200);
    expect(summaryRes.json()).toMatchObject({
      linkId: link.linkId,
      clicksTotal: 1,
    });

    await app.close();
  });

  it("admin can read top-links", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
      analytics: { enabled: true, databaseUrl: infra.analyticsUrl },
    });
    await app.ready();

    const email = "an2@example.com";
    const password = "verylongandsecurepassword";

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password },
    });
    const reg = regRes.json();

    // Promote to admin
    const prisma = createPrismaClient(infra.databaseUrl);
    await prisma.$connect();
    const usersRepo = new PrismaUserRepository(prisma);
    await usersRepo.setRole(reg.userId, "admin");
    await prisma.$disconnect();

    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });
    const login = loginRes.json();

    const topRes = await app.inject({
      method: "GET",
      url: "/admin/api/analytics/top-links?minutes=60&limit=10",
      headers: { authorization: `Bearer ${login.tokens.accessToken}` },
    });

    expect(topRes.statusCode).toBe(200);
    expect(Array.isArray(topRes.json())).toBe(true);

    await app.close();
  });
});
