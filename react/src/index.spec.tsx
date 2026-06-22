import { Schematic } from "@schematichq/schematic-js";
import { act, render, waitFor } from "@testing-library/react";
import { useContext } from "react";
import { vi } from "vitest";

import { SchematicContext } from "./context";
// The raw (non-lazy) adapter. The `WsAdapter` exported from `./index` is a
// `React.lazy`-wrapped ref that mounts asynchronously; for the synchronous
// lifecycle assertions below we bind the raw component directly via
// `ws={RawWsAdapter}` so it mounts (and constructs the client) on first render.
import { WsAdapter as RawWsAdapter } from "./core/WsAdapter";

import { SchematicProvider, useSchematic, useSchematicFlag } from "./index";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

const isDOMEnvironment = typeof document !== "undefined";

describe("schematic-react (root entry / core)", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should export SchematicProvider", () => {
    expect(SchematicProvider).toBeDefined();
  });

  it("should export useSchematicFlag hook", () => {
    expect(useSchematicFlag).toBeDefined();
  });

  (isDOMEnvironment ? it : it.skip)(
    "should render SchematicProvider with children",
    () => {
      const { container } = render(
        <SchematicProvider publishableKey="test-key">
          <div>Hello World</div>
        </SchematicProvider>,
      );

      expect(container.textContent).toBe("Hello World");
    },
  );

  (isDOMEnvironment ? it : it.skip)(
    "should accept a pre-configured client",
    () => {
      const client = new Schematic("test-key");
      const { container } = render(
        <SchematicProvider client={client}>
          <div>Hello World</div>
        </SchematicProvider>,
      );

      expect(container.textContent).toBe("Hello World");
    },
  );

  it("should create Schematic client instance", () => {
    const client = new Schematic("test-key");
    expect(client).toBeDefined();
    expect(typeof client.checkFlag).toBe("function");
    expect(typeof client.track).toBe("function");
    expect(typeof client.identify).toBe("function");
  });
});

(isDOMEnvironment ? describe : describe.skip)("WsAdapter lifecycle", () => {
  it("calls client.cleanup on unmount when no client prop is passed", async () => {
    // `cleanup` is an instance field (arrow function), so we have to spy
    // on the instance the WsAdapter constructs internally. The probe
    // reads it out of context.
    let captured: Schematic | null = null;
    const Probe = () => {
      captured = useContext(SchematicContext).client;
      return null;
    };

    const { unmount } = render(
      <SchematicProvider publishableKey="test-key" ws={RawWsAdapter}>
        <Probe />
      </SchematicProvider>,
    );

    expect(captured).not.toBeNull();
    const cleanupSpy = vi
      .spyOn(captured as unknown as Schematic, "cleanup")
      .mockResolvedValue();

    unmount();

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT call cleanup on unmount when a `client` prop is provided", async () => {
    const client = new Schematic("test-key");
    const cleanupSpy = vi.spyOn(client, "cleanup").mockResolvedValue(undefined);

    const { unmount } = render(
      <SchematicProvider client={client} ws={RawWsAdapter}>
        <div>x</div>
      </SchematicProvider>,
    );

    unmount();

    expect(cleanupSpy).not.toHaveBeenCalled();
  });

  it("warns in dev when publishableKey changes after mount", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { rerender } = render(
      <SchematicProvider publishableKey="key-1" ws={RawWsAdapter}>
        <div>x</div>
      </SchematicProvider>,
    );

    await act(async () => {
      rerender(
        <SchematicProvider publishableKey="key-2" ws={RawWsAdapter}>
          <div>x</div>
        </SchematicProvider>,
      );
    });

    expect(warnSpy).toHaveBeenCalled();
    const message = warnSpy.mock.calls[0]?.[0];
    expect(String(message)).toMatch(/publishableKey changed after mount/i);

    warnSpy.mockRestore();
  });

  it("ws={null} mounts no client; useSchematic throws a clear disabled error", () => {
    const errors: string[] = [];
    const Probe = () => {
      try {
        useSchematic();
        errors.push("no-throw");
      } catch (err) {
        errors.push((err as Error).message);
      }
      return null;
    };

    // Suppress React's error logging for the deliberate throw.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SchematicProvider ws={null}>
        <Probe />
      </SchematicProvider>,
    );

    expect(errors[0]).toMatch(/ws=\{null\}/);
    expect(errors[0]).toMatch(/disabled/i);
    errSpy.mockRestore();
  });

  it("lazy-loads the WS adapter on first core-hook use (default ws)", async () => {
    // No `ws` prop → the adapter is lazy. The client is absent on first
    // render; `useSchematicFlag` triggers the dynamic import from an effect
    // (returning its fallback meanwhile), and once the chunk loads the
    // provider re-renders with the adapter mounted and the client populated.
    let captured: Schematic | null = null;
    let flagValue: boolean | undefined;
    const Probe = () => {
      flagValue = useSchematicFlag("some-flag", { fallback: false });
      captured = useContext(SchematicContext).client;
      return null;
    };

    render(
      <SchematicProvider publishableKey="test-key">
        <Probe />
      </SchematicProvider>,
    );

    // First paint: no Suspense flash, fallback returned, client not yet bound.
    expect(flagValue).toBe(false);
    expect(captured).toBeNull();

    // After the dynamic import resolves and the adapter mounts.
    await waitFor(() => expect(captured).not.toBeNull());
  });
});
