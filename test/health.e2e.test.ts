import { describe, expect, it } from "vitest";
import { createApp } from "@/app";

describe("GET /healthz", () => {
  it("returns 200 and status ok", async () => {
    const app = createApp({ logger: false });
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/healthz",
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.json()).toEqual({ status: "ok" });

    await app.close();
  });
});
