import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  startInfra,
  stopInfra,
  type StartedInfra,
} from "@/../test/integration/infra";
import { createApp } from "@/app";

describe("admin RBAC (e2e)", () => {
  let infra: StartedInfra;

  beforeAll(async () => {
    infra = await startInfra();
  });

  afterAll(async () => {
    await stopInfra(infra);
  });

  it("denies /admin/ping for normal user", async () => {
    const app = createApp({ logger: false, databaseUrl: infra.databaseUrl });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "user1@example.com",
        password: "verylongandsecurepassword",
      },
    });
    const reg = regRes.json();

    const res = await app.inject({
      method: "GET",
      url: "/admin/ping",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("FORBIDDEN");

    await app.close();
  });
});
