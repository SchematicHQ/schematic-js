// State-machine tests for the embed-loader's lazy-coordination logic.
// These hit the module directly (no React) so we can assert subscriber
// fan-out, in-flight coalescing, and cache semantics without dragging in
// the real EmbedAdapter chunk (which is heavy and exercises styled-
// components, i18n, etc.).
//
// The module holds state at the file scope, so each test reloads it
// fresh (via `vi.resetModules`) to observe a clean transition cycle.

import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

async function loadIsolatedModule() {
  vi.doMock("./components/embed/EmbedAdapter", () => ({
    EmbedAdapter: () => null,
  }));
  return await import("./embed-loader");
}

describe("embed-loader state machine", () => {
  it("returns null from the cache until the import resolves", async () => {
    const mod = await loadIsolatedModule();

    expect(mod.getCachedEmbedAdapter()).toBeNull();
    const promise = mod.loadEmbedAdapter();
    expect(mod.getCachedEmbedAdapter()).toBeNull(); // still pending

    await promise;
    expect(mod.getCachedEmbedAdapter()).not.toBeNull();
  });

  it("notifies all subscribers when the import resolves", async () => {
    const mod = await loadIsolatedModule();
    const subA = vi.fn();
    const subB = vi.fn();
    mod.subscribeEmbedAdapter(subA);
    mod.subscribeEmbedAdapter(subB);

    await mod.loadEmbedAdapter();

    expect(subA).toHaveBeenCalledTimes(1);
    expect(subB).toHaveBeenCalledTimes(1);
  });

  it("does not notify subscribers after they unsubscribe", async () => {
    const mod = await loadIsolatedModule();
    const sub = vi.fn();
    const unsub = mod.subscribeEmbedAdapter(sub);
    unsub();

    await mod.loadEmbedAdapter();

    expect(sub).not.toHaveBeenCalled();
  });

  it("coalesces concurrent loadEmbedAdapter calls onto one inflight promise", async () => {
    const mod = await loadIsolatedModule();
    const p1 = mod.loadEmbedAdapter();
    const p2 = mod.loadEmbedAdapter();
    const p3 = mod.loadEmbedAdapter();

    expect(p1).toBe(p2);
    expect(p2).toBe(p3);

    const sub = vi.fn();
    mod.subscribeEmbedAdapter(sub);
    await Promise.all([p1, p2, p3]);

    // All three callers share one resolution; subscribers fire exactly once.
    expect(sub).toHaveBeenCalledTimes(1);
  });

  it("returns the resolved promise on subsequent calls after the import settled", async () => {
    const mod = await loadIsolatedModule();
    await mod.loadEmbedAdapter();
    const afterSettle = mod.loadEmbedAdapter();
    await expect(afterSettle).resolves.toBeUndefined();
    expect(mod.getCachedEmbedAdapter()).not.toBeNull();
  });
});
