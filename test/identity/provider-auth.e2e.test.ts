import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  startInfra,
  stopInfra,
  type StartedInfra,
} from "@/../test/integration/infra";
import { createApp } from "@/app.js";

describe("POST /auth/provider (e2e)", () => {
  let infra: StartedInfra;

  beforeAll(async () => {
    infra = await startInfra();
  });

  afterAll(async () => {
    await stopInfra(infra);
  });

  it("authenticates via local provider and creates external identity link", async () => {
    const app = createApp({ logger: false, databaseUrl: infra.databaseUrl });
    await app.ready();

    // First create a user with password via /auth/register (Step 4 flow)
    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "lp@example.com",
        password: "verylongandsecurepassword",
      },
    });
    expect(reg.statusCode).toBe(201);

    // Then authenticate via provider endpoint
    const res = await app.inject({
      method: "POST",
      url: "/auth/provider",
      payload: {
        provider: "local",
        input: {
          email: "lp@example.com",
          password: "verylongandsecurepassword",
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tokens.accessToken.split(".")).toHaveLength(3);
    expect(typeof body.tokens.refreshToken).toBe("string");
    expect(body.tokens.refreshToken).toContain(".");

    await app.close();
  });
});
