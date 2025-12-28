import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  startInfra,
  stopInfra,
  type StartedInfra,
} from "@/../test/integration/infra.js";
import { createApp } from "@/app.js";
import { createClient } from "redis";
import { infraPromise } from "@/../test/setup-e2e";

describe("redirect (e2e)", () => {
  let infra: Awaited<typeof infraPromise>;

  beforeAll(async () => {
    infra = await infraPromise;
  });

  it("redirects and caches in redis", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    // Register user and create link
    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "r1@example.com",
        password: "verylongandsecurepassword",
      },
    });
    const reg = regRes.json();

    const createRes = await app.inject({
      method: "POST",
      url: "/api/links",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      payload: {
        originalUrl: "https://example.com/path",
        customAlias: null,
        expiresAt: null,
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();

    // First redirect (should hit DB then cache)
    const res1 = await app.inject({ method: "GET", url: `/${created.code}` });
    expect(res1.statusCode).toBe(302);
    expect(res1.headers.location).toBe("https://example.com/path");

    // Check redis has key
    const redis = createClient({ url: infra.redisUrl });
    await redis.connect();

    const cached = await redis.get(`link:code:${created.code}`);
    expect(cached).toBeTruthy();

    await redis.quit();
    await app.close();
  });

  it("blocks unsafe internal targets", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "r2@example.com",
        password: "verylongandsecurepassword",
      },
    });
    const reg = regRes.json();

    // Create custom alias pointing to loopback
    const createRes = await app.inject({
      method: "POST",
      url: "/api/links",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      payload: {
        originalUrl: "http://127.0.0.1/admin",
        customAlias: "loopback123",
        expiresAt: null,
      },
    });
    expect(createRes.statusCode).toBe(201);

    const redir = await app.inject({ method: "GET", url: "/loopback123" });
    expect(redir.statusCode).toBe(400);
    expect(redir.json().error).toBe("LINK_UNSAFE_REDIRECT");

    await app.close();
  });
});
