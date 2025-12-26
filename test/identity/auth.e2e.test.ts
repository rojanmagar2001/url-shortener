import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startInfra, stopInfra, type StartedInfra } from "../integration/infra";
import { createApp } from "@/app";
import { infraPromise } from "@/../test/setup-e2e";

describe("auth (e2e)", () => {
  let infra: Awaited<typeof infraPromise>;

  beforeAll(async () => {
    infra = await infraPromise;
  });

  it("registers then logs in", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "bob@example.com",
        password: "verylongandsecurepassword",
      },
    });

    expect(registerRes.statusCode).toBe(201);
    const reg = registerRes.json();
    expect(reg.userId).toBeTypeOf("string");
    expect(reg.tokens.accessToken.split(".")).toHaveLength(3);
    expect(typeof reg.tokens.refreshToken).toBe("string");
    expect(reg.tokens.refreshToken).toContain(".");

    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "bob@example.com",
        password: "verylongandsecurepassword",
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const login = loginRes.json();

    expect(login.tokens.accessToken.split(".")).toHaveLength(3);
    expect(typeof login.tokens.refreshToken).toBe("string");
    expect(login.tokens.refreshToken).toContain(".");

    await app.close();
  });

  it("rejects bad password", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "eve@example.com",
        password: "verylongandsecurepassword",
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "eve@example.com", password: "wrong" },
    });

    // validation should fail before checking credentials
    expect(loginRes.statusCode).toBe(400);
    const body = loginRes.json();
    expect(body.error).toBe("VALIDATION_ERROR");
    // expect(body.details).toBeTruthy();

    await app.close();
  });
});
