import { Schematic } from "@schematichq/schematic-js";
import { render } from "@testing-library/react";
import { vi } from "vitest";

import { SchematicProvider, useSchematicFlag } from "./index";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

const isDOMEnvironment = typeof document !== "undefined";

describe("schematic-react2 (root entry / core)", () => {
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
