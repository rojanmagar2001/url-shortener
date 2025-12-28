import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  startInfra,
  stopInfra,
  type StartedInfra,
} from "@/../test/integration/infra.js";
import { createApp } from "@/app.js";
import { infraPromise } from "@/../test/setup-e2e";

describe("rate limiting (e2e)", () => {
  let infra: Awaited<typeof infraPromise>;

  beforeAll(async () => {
    infra = await infraPromise;
  });

  it("limits redirect requests by IP", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
      rateLimit: {
        redirect: { limit: 2, windowSeconds: 60 },
        api: { limit: 100, windowSeconds: 60 },
      },
    });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "rl1@example.com",
        password: "verylongandsecurepassword",
      },
    });
    const reg = regRes.json();

    const createRes = await app.inject({
      method: "POST",
      url: "/api/links",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      payload: {
        originalUrl: "https://example.com/rl",
        customAlias: "rlcode1",
        expiresAt: null,
      },
    });
    expect(createRes.statusCode).toBe(201);

    const r1 = await app.inject({ method: "GET", url: "/rlcode1" });
    const r2 = await app.inject({ method: "GET", url: "/rlcode1" });
    const r3 = await app.inject({ method: "GET", url: "/rlcode1" });

    expect(r1.statusCode).toBe(302);
    expect(r2.statusCode).toBe(302);
    expect(r3.statusCode).toBe(429);
    expect(r3.json().error).toBe("RATE_LIMITED");

    await app.close();
  });

  it("limits api key usage by apiKeyId", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
      rateLimit: {
        redirect: { limit: 100, windowSeconds: 60 },
        api: { limit: 2, windowSeconds: 60 },
      },
    });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "rl2@example.com",
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

    const a1 = await app.inject({
      method: "POST",
      url: "/api/links",
      headers: { authorization: `ApiKey ${key.apiKey}` },
      payload: {
        originalUrl: "https://example.com/a1",
        customAlias: null,
        expiresAt: null,
      },
    });
    const a2 = await app.inject({
      method: "POST",
      url: "/api/links",
      headers: { authorization: `ApiKey ${key.apiKey}` },
      payload: {
        originalUrl: "https://example.com/a2",
        customAlias: null,
        expiresAt: null,
      },
    });
    const a3 = await app.inject({
      method: "POST",
      url: "/api/links",
      headers: { authorization: `ApiKey ${key.apiKey}` },
      payload: {
        originalUrl: "https://example.com/a3",
        customAlias: null,
        expiresAt: null,
      },
    });

    expect(a1.statusCode).toBe(201);
    expect(a2.statusCode).toBe(201);
    expect(a3.statusCode).toBe(429);
    expect(a3.json().error).toBe("RATE_LIMITED");

    await app.close();
  });
});
