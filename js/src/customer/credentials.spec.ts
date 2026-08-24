import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccessTokenManager } from "./credentials";

describe("AccessTokenManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a static token and refuses to invalidate it", async () => {
    const manager = new AccessTokenManager("token_static");
    expect(await manager.getToken()).toBe("token_static");
    expect(manager.invalidate()).toBe(false);
    expect(await manager.getToken()).toBe("token_static");
  });

  it("single-flights concurrent provider calls", async () => {
    const provider = vi.fn().mockResolvedValue("token_1");
    const manager = new AccessTokenManager(provider);
    const [a, b] = await Promise.all([manager.getToken(), manager.getToken()]);
    expect(a).toBe("token_1");
    expect(b).toBe("token_1");
    expect(provider).toHaveBeenCalledTimes(1);
    // A held, unexpired token doesn't re-invoke the provider.
    expect(await manager.getToken()).toBe("token_1");
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("refreshes inside the expiry buffer", async () => {
    let n = 0;
    const provider = vi.fn().mockImplementation(async () => ({
      token: `token_${++n}`,
      expiresAt: new Date(Date.now() + 5 * 60_000),
    }));
    const manager = new AccessTokenManager(provider);
    expect(await manager.getToken()).toBe("token_1");
    // Not yet within the 60s buffer of the 5min expiry.
    vi.advanceTimersByTime(3 * 60_000);
    expect(await manager.getToken()).toBe("token_1");
    // Within the buffer: refresh.
    vi.advanceTimersByTime(90_000);
    expect(await manager.getToken()).toBe("token_2");
  });

  it("invalidate forces a refresh, ignoring stale invalidations", async () => {
    let n = 0;
    const provider = vi.fn().mockImplementation(async () => `token_${++n}`);
    const manager = new AccessTokenManager(provider);
    expect(await manager.getToken()).toBe("token_1");
    // Invalidation for a token we no longer hold is a no-op.
    expect(manager.invalidate("token_0")).toBe(true);
    expect(await manager.getToken()).toBe("token_1");
    // Invalidation for the held token drops it.
    expect(manager.invalidate("token_1")).toBe(true);
    expect(await manager.getToken()).toBe("token_2");
  });

  it("a source swap during a refresh wins over the airborne result", async () => {
    let resolveFirst: (value: string) => void = () => {};
    const first = () =>
      new Promise<string>((resolve) => {
        resolveFirst = resolve;
      });
    const manager = new AccessTokenManager(first);
    const pending = manager.getToken();
    manager.setSource("token_replacement");
    resolveFirst("token_stale");
    expect(await pending).toBe("token_replacement");
    expect(await manager.getToken()).toBe("token_replacement");
  });
});
