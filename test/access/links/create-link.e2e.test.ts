import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "@/app";
import { createPrismaClient } from "@/shared/db/prisma";
import { infraPromise } from "@/../test/setup-e2e";

describe("create link (e2e)", () => {
  let infra: Awaited<typeof infraPromise>;

  beforeAll(async () => {
    infra = await infraPromise;
  });

  it("user can create a link", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "l1@example.com",
        password: "verylongandsecurepassword",
      },
    });
    const reg = regRes.json();

    const res = await app.inject({
      method: "POST",
      url: "/api/links",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      payload: {
        originalUrl: "https://example.com/a?b=1",
        customAlias: null,
        expiresAt: null,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.code).toBeTruthy();
    expect(body.originalUrl).toBe("https://example.com/a?b=1");

    await app.close();
  });

  it("api key without links:write is forbidden", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "l2@example.com",
        password: "verylongandsecurepassword",
      },
    });
    const reg = regRes.json();

    const keyRes = await app.inject({
      method: "POST",
      url: "/settings/api-keys",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      payload: { name: "svc", scopes: ["analytics:read"], expiresAt: null },
    });
    const key = keyRes.json();

    const res = await app.inject({
      method: "POST",
      url: "/api/links",
      headers: { authorization: `ApiKey ${key.apiKey}` },
      payload: {
        originalUrl: "https://example.com",
        customAlias: null,
        expiresAt: null,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("FORBIDDEN");

    await app.close();
  });

  it("api key with links:write can create a link and writes audit", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "l3@example.com",
        password: "verylongandsecurepassword",
      },
    });
    const reg = regRes.json();

    const keyRes = await app.inject({
      method: "POST",
      url: "/settings/api-keys",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      payload: { name: "svc", scopes: ["links:write"], expiresAt: null },
    });
    const key = keyRes.json();

    const linkRes = await app.inject({
      method: "POST",
      url: "/api/links",
      headers: { authorization: `ApiKey ${key.apiKey}` },
      payload: {
        originalUrl: "https://example.com/z",
        customAlias: null,
        expiresAt: null,
      },
    });

    expect(linkRes.statusCode).toBe(201);
    const created = linkRes.json();

    const prisma = createPrismaClient(infra.databaseUrl);
    await prisma.$connect();

    const audit = await prisma.auditLog.findFirst({
      where: { action: "links.create", resourceId: created.linkId },
    });

    await prisma.$disconnect();
    await app.close();

    expect(audit).toBeTruthy();
    expect(audit?.actorType).toBe("api_key");
  });
});
