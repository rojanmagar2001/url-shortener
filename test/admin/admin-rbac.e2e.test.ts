import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  startInfra,
  stopInfra,
  type StartedInfra,
} from "@/../test/integration/infra.js";
import { createApp } from "@/app.js";
import { createPrismaClient } from "@/shared/db/prisma.js";
import { PrismaUserRepository } from "@/identity/infrastructure/persistence/prisma-user-repository.js";

describe("admin RBAC (e2e)", () => {
  let infra: StartedInfra;

  beforeAll(async () => {
    infra = await startInfra();
  });

  afterAll(async () => {
    await stopInfra(infra);
  });

  it("denies /admin/ping for normal user", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
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
    const body = res.json();
    expect(body.error).toBe("FORBIDDEN");

    await app.close();
  });

  it("allows /admin/ping for admin user", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
    });
    await app.ready();

    // Register normal user first
    const email = "admin1@example.com";
    const password = "verylongandsecurepassword";

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password },
    });
    expect(regRes.statusCode).toBe(201);
    const reg = regRes.json();

    // Promote to admin directly via repository (no HTTP backdoor)
    const prisma = createPrismaClient(infra.databaseUrl);
    await prisma.$connect();
    const usersRepo = new PrismaUserRepository(prisma);

    await usersRepo.setRole(reg.userId, "admin");

    await prisma.$disconnect();

    // Re-login to get a token with role=admin
    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });
    expect(loginRes.statusCode).toBe(200);
    const login = loginRes.json();

    const pingRes = await app.inject({
      method: "GET",
      url: "/admin/ping",
      headers: { authorization: `Bearer ${login.tokens.accessToken}` },
    });

    expect(pingRes.statusCode).toBe(200);
    expect(pingRes.json()).toEqual({ ok: true });

    await app.close();
  });
});
