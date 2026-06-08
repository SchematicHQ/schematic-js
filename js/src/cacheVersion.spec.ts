import { describe, it, expect } from "vitest";
import { cacheVersion } from "./cacheVersion";

describe("cacheVersion", () => {
  it("is an 8-character lowercase hex string", () => {
    expect(cacheVersion).toMatch(/^[0-9a-f]{8}$/);
  });

  it("is non-empty", () => {
    expect(cacheVersion).not.toBe("");
  });
});
