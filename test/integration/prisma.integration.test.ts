import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@/shared/db/prisma";
import { startInfra, stopInfra, type StartedInfra } from "./infra";
import { infraPromise } from "@/../test/setup-e2e";

describe("prisma + postgres (integration)", () => {
  let infra: Awaited<typeof infraPromise>;
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    infra = await infraPromise;
    prisma = createPrismaClient(infra.databaseUrl);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("can create and fetch a user", async () => {
    const created = await prisma.user.create({
      data: { email: "alice@example.com", role: "user" },
    });

    const fetched = await prisma.user.findUnique({ where: { id: created.id } });
    expect(fetched).not.toBeNull();
    expect(fetched?.email).toBe("alice@example.com");
    expect(fetched?.role).toBe("user");
  });

  it("enforces unique email", async () => {
    await prisma.user.create({
      data: { email: "dup@example.com", role: "user" },
    });

    await expect(
      prisma.user.create({ data: { email: "dup@example.com", role: "user" } }),
    ).rejects.toBeTruthy();
  });
});
