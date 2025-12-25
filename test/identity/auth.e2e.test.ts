import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startInfra, stopInfra, type StartedInfra } from "../integration/infra";
import { createApp } from "@/app";

describe("auth (e2e)", () => {
  let infra: StartedInfra;

  beforeAll(async () => {
    infra = await startInfra();
  });

  afterAll(async () => {
    await stopInfra(infra);
  });

  it("registers then logs in", async () => {
    const app = createApp({ logger: false, databaseUrl: infra.databaseUrl });
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
    expect(reg.tokens.accessToken).toContain("dev-access-");

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
    expect(login.tokens.refreshToken).toContain("dev-refresh-");

    await app.close();
  });

  it("rejects bad password", async () => {
    const app = createApp({ logger: false, databaseUrl: infra.databaseUrl });
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
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBeTruthy();

    await app.close();
  });
});
