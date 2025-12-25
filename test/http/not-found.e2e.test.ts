import { describe, expect, it } from "vitest";
import { createApp } from "@/app";

describe("not found handler (e2e)", () => {
  it("returns a consistent NOT_FOUND envelope", async () => {
    const app = createApp({
      logger: false,
      databaseUrl: "postgresql://unused",
    });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({
      error: "NOT_FOUND",
      message: "Not found",
    });

    await app.close();
  });
});
