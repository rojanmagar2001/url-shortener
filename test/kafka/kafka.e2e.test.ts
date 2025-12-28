import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  startInfra,
  stopInfra,
  type StartedInfra,
} from "@/../test/integration/infra.js";
import { createApp } from "@/app.js";
import { TOPICS } from "@/shared/kafka/topics.js";
import { consumeOneJson } from "@/../test/integration/kafka.js";
import type { LinkClickedEvent } from "@/shared/events/link-clicked-event.js";
import type { AuditEvent } from "@/shared/events/audit-event.js";
import { infraPromise } from "@/../test/setup-e2e";

describe("kafka events (e2e)", () => {
  let infra: Awaited<typeof infraPromise>;

  beforeAll(async () => {
    infra = await infraPromise;
  });

  it("publishes link-clicked on redirect", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
      kafka: { enabled: true, brokers: infra.kafkaBrokers },
    });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "kc1@example.com",
        password: "verylongandsecurepassword",
      },
    });
    const reg = regRes.json();

    const createRes = await app.inject({
      method: "POST",
      url: "/api/links",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      payload: {
        originalUrl: "https://example.com/kc",
        customAlias: "kc12345",
        expiresAt: null,
      },
    });
    expect(createRes.statusCode).toBe(201);

    const consumerPromise = consumeOneJson<LinkClickedEvent>({
      brokers: infra.kafkaBrokers,
      topic: TOPICS.linkClicked,
      groupId: `g-${Date.now()}-clicked`,
    });

    const redir = await app.inject({ method: "GET", url: "/kc12345" });
    expect(redir.statusCode).toBe(302);

    const msg = await consumerPromise;
    expect(msg.value.code).toBe("kc12345");
    expect(typeof msg.value.clickedAt).toBe("string");

    await app.close();
  });

  it("publishes audit events for api key creation", async () => {
    const app = await createApp({
      logger: false,
      databaseUrl: infra.databaseUrl,
      kafka: { enabled: true, brokers: infra.kafkaBrokers },
    });
    await app.ready();

    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "kc2@example.com",
        password: "verylongandsecurepassword",
      },
    });
    const reg = regRes.json();

    const consumerPromise = consumeOneJson<AuditEvent>({
      brokers: infra.kafkaBrokers,
      topic: TOPICS.audit,
      groupId: `g-${Date.now()}-audit`,
    });

    const keyRes = await app.inject({
      method: "POST",
      url: "/settings/api-keys",
      headers: { authorization: `Bearer ${reg.tokens.accessToken}` },
      payload: { name: "svc", scopes: ["links:write"], expiresAt: null },
    });
    expect(keyRes.statusCode).toBe(201);

    const msg = await consumerPromise;
    expect(msg.value.action).toBe("access.api-key.create");
    expect(msg.value.actorType).toBe("user");

    await app.close();
  });
});
