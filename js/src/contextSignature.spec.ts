import { describe, expect, it, vi } from "vitest";

import {
  ContextSignatureManager,
  parseSignatureExpiryMs,
} from "./contextSignature";

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Build a signature value `iat.exp.sig` whose exp is `ttlSeconds` from now. */
const signatureWithTtl = (ttlSeconds: number, sig = "deadbeef"): string => {
  const iat = nowSeconds();
  const exp = iat + ttlSeconds;
  return `${iat}.${exp}.${sig}`;
};

const noopDebug = () => {};

describe("parseSignatureExpiryMs", () => {
  it("returns the exp segment in milliseconds", () => {
    expect(parseSignatureExpiryMs("100.200.abc")).toBe(200_000);
  });

  it("returns null when there are not exactly three segments", () => {
    expect(parseSignatureExpiryMs("100.200")).toBeNull();
    expect(parseSignatureExpiryMs("100.200.abc.def")).toBeNull();
    expect(parseSignatureExpiryMs("")).toBeNull();
  });

  it("returns null when exp is not a finite number", () => {
    expect(parseSignatureExpiryMs("100.notanumber.abc")).toBeNull();
  });
});

describe("ContextSignatureManager", () => {
  const context = { company: { id: "comp_1" }, user: { id: "user_1" } };

  it("returns the signature from the provider", async () => {
    const sig = signatureWithTtl(600);
    const provider = vi.fn().mockResolvedValue(sig);
    const manager = new ContextSignatureManager(provider, noopDebug);

    expect(await manager.getSignature(context)).toBe(sig);
    expect(provider).toHaveBeenCalledWith(context);
  });

  it("caches a fresh signature and does not call the provider again", async () => {
    const sig = signatureWithTtl(600);
    const provider = vi.fn().mockResolvedValue(sig);
    const manager = new ContextSignatureManager(provider, noopDebug);

    await manager.getSignature(context);
    await manager.getSignature(context);

    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("refreshes when the cached signature is within the skew of expiry", async () => {
    // 30s TTL is inside the 60s refresh window, so each call refetches.
    const provider = vi.fn(async () => signatureWithTtl(30));
    const manager = new ContextSignatureManager(provider, noopDebug);

    await manager.getSignature(context);
    await manager.getSignature(context);

    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("dedupes concurrent requests for the same context", async () => {
    let resolveProvider: (value: string) => void = () => {};
    const provider = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveProvider = resolve;
        }),
    );
    const manager = new ContextSignatureManager(provider, noopDebug);

    const first = manager.getSignature(context);
    const second = manager.getSignature(context);
    resolveProvider(signatureWithTtl(600));

    await Promise.all([first, second]);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("keys the cache by context, fetching once per distinct context", async () => {
    const provider = vi.fn(async () => signatureWithTtl(600));
    const manager = new ContextSignatureManager(provider, noopDebug);

    await manager.getSignature({ company: { id: "a" } });
    await manager.getSignature({ company: { id: "b" } });
    await manager.getSignature({ company: { id: "a" } });

    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("returns undefined and warns when the provider throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const provider = vi.fn().mockRejectedValue(new Error("backend down"));
    const manager = new ContextSignatureManager(provider, noopDebug);

    expect(await manager.getSignature(context)).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns an unparseable signature but does not cache it", async () => {
    const provider = vi.fn().mockResolvedValue("not-a-valid-signature");
    const manager = new ContextSignatureManager(provider, noopDebug);

    expect(await manager.getSignature(context)).toBe("not-a-valid-signature");
    await manager.getSignature(context);
    expect(provider).toHaveBeenCalledTimes(2);
  });
});
