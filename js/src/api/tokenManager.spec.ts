import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TokenManager } from "./tokenManager";

const jsonResponse = (status: number): Response =>
  new Response(JSON.stringify({}), { status });

describe("TokenManager", () => {
  describe("static token", () => {
    it("returns the static token", async () => {
      const manager = new TokenManager("token_static");
      await expect(manager.getToken()).resolves.toBe("token_static");
    });

    it("is static and does not retry on 401", async () => {
      const manager = new TokenManager("token_static");
      expect(manager.isStatic).toBe(true);
      const middleware = manager.middleware();
      const fetch = vi.fn();
      const result = await middleware.post?.({
        fetch,
        url: "https://api.schematichq.com/components/hydrate",
        init: {},
        response: jsonResponse(401),
      });
      expect(result).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("resolver token", () => {
    it("resolves lazily and caches the token", async () => {
      const resolver = vi.fn().mockResolvedValue("token_abc");
      const manager = new TokenManager(resolver);
      expect(resolver).not.toHaveBeenCalled();
      await expect(manager.getToken()).resolves.toBe("token_abc");
      await expect(manager.getToken()).resolves.toBe("token_abc");
      expect(resolver).toHaveBeenCalledTimes(1);
    });

    it("accepts { token, expiresAt } results", async () => {
      const manager = new TokenManager(async () => ({
        token: "token_abc",
        expiresAt: new Date(Date.now() + 15 * 60_000),
      }));
      await expect(manager.getToken()).resolves.toBe("token_abc");
    });

    it("shares a single in-flight resolution between concurrent callers", async () => {
      let resolveToken: (token: string) => void = () => {};
      const resolver = vi.fn(
        () => new Promise<string>((resolve) => (resolveToken = resolve)),
      );
      const manager = new TokenManager(resolver);
      const first = manager.getToken();
      const second = manager.getToken();
      resolveToken("token_abc");
      await expect(first).resolves.toBe("token_abc");
      await expect(second).resolves.toBe("token_abc");
      expect(resolver).toHaveBeenCalledTimes(1);
    });

    it("re-invokes the resolver after invalidate()", async () => {
      const resolver = vi
        .fn()
        .mockResolvedValueOnce("token_one")
        .mockResolvedValueOnce("token_two");
      const manager = new TokenManager(resolver);
      await expect(manager.getToken()).resolves.toBe("token_one");
      manager.invalidate();
      await expect(manager.getToken()).resolves.toBe("token_two");
      expect(resolver).toHaveBeenCalledTimes(2);
    });

    it("does not cache a failed resolution", async () => {
      const resolver = vi
        .fn()
        .mockRejectedValueOnce(new Error("mint failed"))
        .mockResolvedValueOnce("token_after_failure");
      const manager = new TokenManager(resolver);
      await expect(manager.getToken()).rejects.toThrow("mint failed");
      await expect(manager.getToken()).resolves.toBe("token_after_failure");
    });
  });

  describe("proactive refresh", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-05T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("refreshes when the cached token is within the refresh buffer of expiry", async () => {
      const resolver = vi
        .fn()
        .mockResolvedValueOnce({
          token: "token_one",
          expiresAt: new Date(Date.now() + 15 * 60_000),
        })
        .mockResolvedValueOnce({ token: "token_two" });
      const manager = new TokenManager(resolver);
      await expect(manager.getToken()).resolves.toBe("token_one");

      // 13 minutes in: still outside the 60s buffer before the 15-minute expiry
      vi.setSystemTime(new Date("2026-08-05T12:13:00Z"));
      await expect(manager.getToken()).resolves.toBe("token_one");
      expect(resolver).toHaveBeenCalledTimes(1);

      // 14.5 minutes in: within the buffer, so a fresh token is minted
      vi.setSystemTime(new Date("2026-08-05T12:14:30Z"));
      await expect(manager.getToken()).resolves.toBe("token_two");
      expect(resolver).toHaveBeenCalledTimes(2);
    });

    it("honors a custom refreshBufferMs", async () => {
      const resolver = vi
        .fn()
        .mockResolvedValueOnce({
          token: "token_one",
          expiresAt: new Date(Date.now() + 10_000),
        })
        .mockResolvedValueOnce({ token: "token_two" });
      const manager = new TokenManager(resolver, { refreshBufferMs: 0 });
      await expect(manager.getToken()).resolves.toBe("token_one");
      vi.setSystemTime(new Date("2026-08-05T12:00:09Z"));
      await expect(manager.getToken()).resolves.toBe("token_one");
      vi.setSystemTime(new Date("2026-08-05T12:00:10Z"));
      await expect(manager.getToken()).resolves.toBe("token_two");
    });
  });

  describe("401 retry middleware", () => {
    it("invalidates, refreshes, and replays the request once on 401", async () => {
      const resolver = vi
        .fn()
        .mockResolvedValueOnce("token_stale")
        .mockResolvedValueOnce("token_fresh");
      const manager = new TokenManager(resolver);
      await manager.getToken();

      const retryResponse = jsonResponse(200);
      const fetch = vi.fn().mockResolvedValue(retryResponse);
      const middleware = manager.middleware();
      const result = await middleware.post?.({
        fetch,
        url: "https://api.schematichq.com/components/hydrate",
        init: { headers: { "X-Schematic-Api-Key": "token_stale" } },
        response: jsonResponse(401),
      });

      expect(result).toBe(retryResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, retryInit] = fetch.mock.calls[0];
      expect(url).toBe("https://api.schematichq.com/components/hydrate");
      expect(retryInit.headers["X-Schematic-Api-Key"]).toBe("token_fresh");
    });

    it("does not retry with a token that was itself minted as a retry", async () => {
      const resolver = vi
        .fn()
        .mockResolvedValueOnce("token_one")
        .mockResolvedValueOnce("token_two");
      const manager = new TokenManager(resolver);
      await manager.getToken();

      const middleware = manager.middleware();
      // First 401: retried with a fresh token, but the retry also comes back 401
      const fetch = vi.fn().mockResolvedValue(jsonResponse(401));
      await middleware.post?.({
        fetch,
        url: "https://api.schematichq.com/checkout",
        init: { headers: { "X-Schematic-Api-Key": "token_one" } },
        response: jsonResponse(401),
      });
      expect(fetch).toHaveBeenCalledTimes(1);
      const [, retryInit] = fetch.mock.calls[0];
      expect(retryInit.headers["X-Schematic-Api-Key"]).toBe("token_two");

      // The retried request's own 401 flows back through the middleware; no second retry
      const result = await middleware.post?.({
        fetch,
        url: "https://api.schematichq.com/checkout",
        init: retryInit,
        response: jsonResponse(401),
      });
      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("guards on the token value even when middleware rebuilds the request object", async () => {
      const resolver = vi
        .fn()
        .mockResolvedValueOnce("token_one")
        .mockResolvedValueOnce("token_two");
      const manager = new TokenManager(resolver);
      await manager.getToken();

      const middleware = manager.middleware();
      const fetch = vi.fn().mockResolvedValue(jsonResponse(401));
      await middleware.post?.({
        fetch,
        url: "https://api.schematichq.com/checkout",
        init: { headers: { "X-Schematic-Api-Key": "token_one" } },
        response: jsonResponse(401),
      });
      expect(fetch).toHaveBeenCalledTimes(1);

      // Simulate a consumer pre() middleware having rebuilt the retried
      // request into a brand-new init object: same token, new identity
      const rebuiltInit = {
        headers: { "x-schematic-api-key": "token_two" },
        cache: "no-store" as const,
      };
      const result = await middleware.post?.({
        fetch,
        url: "https://api.schematichq.com/checkout",
        init: rebuiltInit,
        response: jsonResponse(401),
      });
      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(resolver).toHaveBeenCalledTimes(2);
    });

    it("retries again after the token has authenticated successfully (expiry case)", async () => {
      const resolver = vi
        .fn()
        .mockResolvedValueOnce("token_one")
        .mockResolvedValueOnce("token_two")
        .mockResolvedValueOnce("token_three");
      const manager = new TokenManager(resolver);
      await manager.getToken();

      const middleware = manager.middleware();
      const fetch = vi.fn().mockResolvedValue(jsonResponse(200));
      // token_one 401s; retry mints token_two
      await middleware.post?.({
        fetch,
        url: "https://api.schematichq.com/checkout",
        init: { headers: { "X-Schematic-Api-Key": "token_one" } },
        response: jsonResponse(401),
      });
      // token_two later authenticates a request successfully...
      await middleware.post?.({
        fetch,
        url: "https://api.schematichq.com/checkout",
        init: { headers: { "X-Schematic-Api-Key": "token_two" } },
        response: jsonResponse(200),
      });
      // ...so when it eventually expires and 401s, it earns a fresh retry
      await middleware.post?.({
        fetch,
        url: "https://api.schematichq.com/checkout",
        init: { headers: { "X-Schematic-Api-Key": "token_two" } },
        response: jsonResponse(401),
      });
      expect(fetch).toHaveBeenCalledTimes(2);
      const [, secondRetryInit] = fetch.mock.calls[1];
      expect(secondRetryInit.headers["X-Schematic-Api-Key"]).toBe(
        "token_three",
      );
    });

    it("does not retry a request that carried no api key header", async () => {
      const resolver = vi.fn().mockResolvedValue("token_fresh");
      const manager = new TokenManager(resolver);
      const fetch = vi.fn();
      const result = await manager.middleware().post?.({
        fetch,
        url: "https://api.schematichq.com/checkout",
        init: {},
        response: jsonResponse(401),
      });
      expect(result).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
      expect(resolver).not.toHaveBeenCalled();
    });

    it("surfaces the original 401 when the refresh itself fails", async () => {
      const resolver = vi
        .fn()
        .mockResolvedValueOnce("token_stale")
        .mockRejectedValueOnce(new Error("mint failed"));
      const manager = new TokenManager(resolver);
      await manager.getToken();

      const fetch = vi.fn();
      const result = await manager.middleware().post?.({
        fetch,
        url: "https://api.schematichq.com/checkout",
        init: { headers: { "X-Schematic-Api-Key": "token_stale" } },
        response: jsonResponse(401),
      });
      expect(result).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("ignores non-401 responses", async () => {
      const manager = new TokenManager(vi.fn().mockResolvedValue("token_abc"));
      const fetch = vi.fn();
      const result = await manager.middleware().post?.({
        fetch,
        url: "https://api.schematichq.com/checkout",
        init: {},
        response: jsonResponse(500),
      });
      expect(result).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("preserves Headers-instance headers on retry", async () => {
      const resolver = vi
        .fn()
        .mockResolvedValueOnce("token_stale")
        .mockResolvedValueOnce("token_fresh");
      const manager = new TokenManager(resolver);
      await manager.getToken();

      const fetch = vi.fn().mockResolvedValue(jsonResponse(200));
      await manager.middleware().post?.({
        fetch,
        url: "https://api.schematichq.com/checkout",
        init: {
          headers: new Headers({
            "Content-Type": "application/json",
            "X-Schematic-Api-Key": "token_stale",
          }),
        },
        response: jsonResponse(401),
      });
      const [, retryInit] = fetch.mock.calls[0];
      expect(retryInit.headers["content-type"]).toBe("application/json");
      expect(retryInit.headers["X-Schematic-Api-Key"]).toBe("token_fresh");
      expect(retryInit.headers["x-schematic-api-key"]).toBeUndefined();
    });
  });
});
