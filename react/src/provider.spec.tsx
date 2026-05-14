// Tests for the bare plugin host in `src/provider.tsx`. We avoid loading
// the real `EmbedAdapter` (heavy) by exercising the host with synthetic
// adapter components that capture the props they receive.

import { act, render, waitFor } from "@testing-library/react";
import { useContext } from "react";

import { SchematicContext } from "./context";
import { SchematicEmbedDisabledContext } from "./embed-loader";
import {
  SchematicProvider as BareSchematicProvider,
  type SchematicAdapter,
  type SchematicAdapterProps,
} from "./provider";

function makeRecordingAdapter(): {
  Adapter: SchematicAdapter;
  calls: SchematicAdapterProps[];
} {
  const calls: SchematicAdapterProps[] = [];
  const Adapter: SchematicAdapter = (props: SchematicAdapterProps) => {
    calls.push({ ...props });
    return <>{props.children}</>;
  };
  return { Adapter, calls };
}

describe("bare SchematicProvider — adapter composition", () => {
  it("forwards children unchanged when no adapters are bound", () => {
    const { container } = render(
      <BareSchematicProvider>
        <span>hello</span>
      </BareSchematicProvider>,
    );
    expect(container.textContent).toBe("hello");
  });

  it("mounts both ws and embed adapters around children, ws outermost", () => {
    const Outer: SchematicAdapter = (props: SchematicAdapterProps) => (
      <div data-testid="outer">{props.children}</div>
    );
    const Inner: SchematicAdapter = (props: SchematicAdapterProps) => (
      <div data-testid="inner">{props.children}</div>
    );

    const { getByTestId } = render(
      <BareSchematicProvider ws={Outer} embed={Inner}>
        <span>x</span>
      </BareSchematicProvider>,
    );

    const outer = getByTestId("outer");
    const inner = getByTestId("inner");
    expect(outer.contains(inner)).toBe(true);
  });
});

describe("bare SchematicProvider — per-adapter prop filtering", () => {
  it("strips embed-only props before handing them to the WS adapter", () => {
    const { Adapter: Ws, calls: wsCalls } = makeRecordingAdapter();

    render(
      <BareSchematicProvider
        ws={Ws}
        publishableKey="key"
        apiConfig={{ basePath: "http://x" }}
        settings={{ mode: "light" } as unknown}
        currencyFilter={["USD"]}
        debug
        additionalHeaders={{ "X-Custom": "y" }}
      >
        <span>x</span>
      </BareSchematicProvider>,
    );

    expect(wsCalls).toHaveLength(1);
    const props = wsCalls[0]!;
    expect(props.publishableKey).toBe("key");
    expect(props.apiConfig).toBeUndefined();
    expect(props.settings).toBeUndefined();
    expect(props.currencyFilter).toBeUndefined();
    expect(props.debug).toBeUndefined();
    // CoreOptions like `additionalHeaders` MUST still pass through to WS.
    expect(
      (props as unknown as { additionalHeaders?: Record<string, string> })
        .additionalHeaders,
    ).toEqual({ "X-Custom": "y" });
  });

  it("hands embed adapter only the embed-relevant slice", () => {
    const { Adapter: Embed, calls: embedCalls } = makeRecordingAdapter();
    const ws: SchematicAdapter = ({ children }) => <>{children}</>;

    render(
      <BareSchematicProvider
        ws={ws}
        embed={Embed}
        publishableKey="key"
        apiConfig={{ basePath: "http://x" }}
        currencyFilter={["USD"]}
        additionalHeaders={{ "X-Should-Not-Leak": "z" }}
      >
        <span>x</span>
      </BareSchematicProvider>,
    );

    expect(embedCalls).toHaveLength(1);
    const props = embedCalls[0]!;
    expect(props.publishableKey).toBe("key");
    expect(props.apiConfig).toEqual({ basePath: "http://x" });
    expect(props.currencyFilter).toEqual(["USD"]);
    expect(
      (props as unknown as { additionalHeaders?: Record<string, string> })
        .additionalHeaders,
    ).toBeUndefined();
  });
});

describe("bare SchematicProvider — embed disabled signal", () => {
  it("publishes SchematicEmbedDisabledContext={true} when embed={null}", () => {
    let observed: boolean | undefined;
    const Probe = () => {
      observed = useContext(SchematicEmbedDisabledContext);
      return null;
    };

    render(
      <BareSchematicProvider embed={null}>
        <Probe />
      </BareSchematicProvider>,
    );

    expect(observed).toBe(true);
  });

  it("publishes SchematicEmbedDisabledContext={false} when embed is undefined", () => {
    let observed: boolean | undefined;
    const Probe = () => {
      observed = useContext(SchematicEmbedDisabledContext);
      return null;
    };

    render(
      <BareSchematicProvider>
        <Probe />
      </BareSchematicProvider>,
    );

    expect(observed).toBe(false);
  });
});

describe("bare SchematicProvider — Suspense topology", () => {
  it("inner Suspense catches a child throw without invoking the outer fallback", async () => {
    let resolveLoad: (() => void) | undefined;
    const loadPromise = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });
    let throws = 1;

    const Thrower = () => {
      if (throws > 0) {
        throws -= 1;
        throw loadPromise;
      }
      return <span data-testid="ok">ok</span>;
    };

    const { queryByText, getByTestId } = render(
      <BareSchematicProvider fallback={<span>OUTER-FALLBACK</span>}>
        <Thrower />
      </BareSchematicProvider>,
    );

    // The inner boundary (null fallback) catches the throw; the outer
    // fallback should never appear.
    expect(queryByText("OUTER-FALLBACK")).toBeNull();

    await act(async () => {
      resolveLoad!();
      await loadPromise;
    });

    await waitFor(() => expect(getByTestId("ok")).toBeTruthy());
  });
});

describe("bare SchematicProvider — context default", () => {
  it("provides null client + null embed when no adapters mounted", () => {
    let snapshot: { client: unknown; embed: unknown } | undefined;
    const Probe = () => {
      snapshot = useContext(SchematicContext);
      return null;
    };

    render(
      <BareSchematicProvider ws={null}>
        <Probe />
      </BareSchematicProvider>,
    );

    expect(snapshot?.client).toBeNull();
    expect(snapshot?.embed).toBeNull();
  });
});
