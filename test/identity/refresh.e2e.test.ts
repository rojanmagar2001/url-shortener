import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  startInfra,
  stopInfra,
  type StartedInfra,
} from "@/../test/integration/infra";
import { createApp } from "@/app";
import { infraPromise } from "@/../test/setup-e2e";

function isJwt(token: string): boolean {
  return token.split(".").length === 3;
}

describe("auth refresh (e2e)", () => {
  let infra: Awaited<typeof infraPromise>;

  beforeAll(async () => {
    infra = await infraPromise;
  });

  it("rotates refresh token and revokes old session", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "rot@example.com",
        password: "verylongandsecurepassword",
      },
    });
    expect(regRes.statusCode).toBe(201);

    const reg = regRes.json();
    expect(isJwt(reg.tokens.accessToken)).toBe(true);
    expect(String(reg.tokens.refreshToken)).toContain(".");

    const refreshRes = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: reg.tokens.refreshToken },
    });
    expect(refreshRes.statusCode).toBe(200);

    const refreshed = refreshRes.json();
    expect(isJwt(refreshed.tokens.accessToken)).toBe(true);
    expect(String(refreshed.tokens.refreshToken)).toContain(".");

    // Old refresh token should now be invalid (revoked session)
    const refreshAgain = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: reg.tokens.refreshToken },
    });
    expect(refreshAgain.statusCode).toBe(401);
    expect(refreshAgain.json().error).toBe("SESSION_REVOKED");

    await app.close();
  });

  it("access token authorizes /me", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "me@example.com",
        password: "verylongandsecurepassword",
      },
    });
    const reg = regRes.json();

    const meRes = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
    });

    expect(meRes.statusCode).toBe(200);
    expect(meRes.json()).toMatchObject({ userId: reg.userId });

    await app.close();
  });
});
