import { vi } from "vitest";
import { Schematic } from "@schematichq/schematic-js";
import { provideSchematic, SchematicService, SCHEMATIC_CLIENT } from "./index";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

describe("schematic-angular", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should export provideSchematic", () => {
    expect(provideSchematic).toBeDefined();
    expect(typeof provideSchematic).toBe("function");
  });

  it("should export SchematicService", () => {
    expect(SchematicService).toBeDefined();
  });

  it("should export SCHEMATIC_CLIENT token", () => {
    expect(SCHEMATIC_CLIENT).toBeDefined();
  });

  it("should create Schematic client instance", () => {
    const client = new Schematic("test-key");
    expect(client).toBeDefined();
    expect(typeof client.checkFlag).toBe("function");
    expect(typeof client.track).toBe("function");
    expect(typeof client.identify).toBe("function");
  });
});
