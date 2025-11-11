import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { Schematic } from "@schematichq/schematic-js";
import { SchematicPlugin, useSchematicFlag } from "./index";

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  } as Response),
);

describe("schematic-vue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export SchematicPlugin", () => {
    expect(SchematicPlugin).toBeDefined();
  });

  it("should export useSchematicFlag composable", () => {
    expect(useSchematicFlag).toBeDefined();
  });

  it("should install plugin and provide client", () => {
    const TestComponent = defineComponent({
      template: "<div>Hello World</div>",
    });

    const wrapper = mount(TestComponent, {
      global: {
        plugins: [[SchematicPlugin, { publishableKey: "test-key" }]],
      },
    });

    expect(wrapper.text()).toBe("Hello World");
  });

  it("should accept a pre-configured client", () => {
    const client = new Schematic("test-key");

    const TestComponent = defineComponent({
      template: "<div>Hello World</div>",
    });

    const wrapper = mount(TestComponent, {
      global: {
        plugins: [[SchematicPlugin, { client }]],
      },
    });

    expect(wrapper.text()).toBe("Hello World");
  });

  it("should create Schematic client instance", () => {
    const client = new Schematic("test-key");
    expect(client).toBeDefined();
    expect(typeof client.checkFlag).toBe("function");
    expect(typeof client.track).toBe("function");
    expect(typeof client.identify).toBe("function");
  });
});
