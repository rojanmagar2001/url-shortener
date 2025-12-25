import { describe, expect, it } from "vitest";
import { config } from "@/shared/config";

describe("@/ path alias", () => {
  it("resolves imports from src/", () => {
    expect(config.http.port).toBeTypeOf("number");
  });
});
