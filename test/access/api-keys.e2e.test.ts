import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  startInfra,
  stopInfra,
  type StartedInfra,
} from "@/../test/integration/infra";
import { createApp } from "@/app";
import { infraPromise } from "@/../test/setup-e2e";

describe("api keys (e2e)", () => {
  let infra: Awaited<typeof infraPromise>;

  beforeAll(async () => {
    infra = await infraPromise;
  });

  it("creates an API key and can authenticate with it", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    // Register user
    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "k1@example.com",
        password: "verylongandsecurepassword",
      },
    });
    expect(regRes.statusCode).toBe(201);
    const reg = regRes.json();

    // Create API key
    const createRes = await app.inject({
      method: "POST",
      url: "/settings/api-keys",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      payload: { name: "svc", scopes: ["links:write"], expiresAt: null },
    });
    expect(createRes.statusCode).toBe(201);

    const created = createRes.json();
    expect(String(created.apiKey)).toContain(".");
    expect(String(created.keyPrefix)).toHaveLength(8);

    // Use API key to call /me (should work because requireAuth allows api_key too)
    const meRes = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `ApiKey ${created.apiKey}` },
    });

    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().userId).toBe(reg.userId);

    await app.close();
  });
});
