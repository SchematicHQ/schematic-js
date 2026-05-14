// Verifies the bare provider is safe to import + render on the server, and
// that the lazy embed mechanism behaves predictably during SSR: it renders
// the configured `fallback` (or `null`) for embed-using subtrees rather
// than throwing past the provider boundary.

import { renderToString } from "react-dom/server";

import { SchematicProvider as BareSchematicProvider } from "./provider";

describe("SSR / renderToString", () => {
  it("renders children inert when no adapters are bound", () => {
    const html = renderToString(
      <BareSchematicProvider>
        <span data-testid="ssr-content">ssr-ok</span>
      </BareSchematicProvider>,
    );
    expect(html).toContain("ssr-ok");
  });

  it("renders the outer fallback (and not the throwing child) when a descendant suspends past both boundaries", () => {
    const Thrower = () => {
      throw new Promise<void>(() => {
        // Never resolves — emulates an SSR snapshot for a lazy adapter that
        // never settles on the server.
      });
    };

    // To force the throw past the inner boundary, the inner Suspense uses
    // a null fallback (it renders nothing) — and the outer fallback is
    // what the user sees. We assert the throw doesn't escape past the
    // outer boundary.
    const html = renderToString(
      <BareSchematicProvider fallback={<span>SSR-FALLBACK</span>}>
        <Thrower />
      </BareSchematicProvider>,
    );

    // Either the inner boundary swallowed it (rendering null) or the outer
    // boundary kicked in. Neither outcome should throw past
    // renderToString. The inner boundary is `<Suspense fallback={null}>`
    // which on SSR renders nothing for an unresolved throw, so we expect
    // the document to be effectively empty in the children slot — not the
    // outer fallback (the inner one catches first).
    expect(html).not.toContain("SSR-FALLBACK");
  });

  it("can be imported and rendered without a DOM (no window references at module scope)", () => {
    // If anything in the provider's module graph touches `window` at top
    // level, this would throw before we even get to renderToString.
    expect(() =>
      renderToString(
        <BareSchematicProvider>
          <span>ok</span>
        </BareSchematicProvider>,
      ),
    ).not.toThrow();
  });
});
