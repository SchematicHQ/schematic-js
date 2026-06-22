import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { Schematic, type CreditBalances } from "@schematichq/schematic-js";
import {
  SchematicPlugin,
  useSchematicCreditBalance,
  useSchematicFlag,
  type CreditBalanceType,
} from "./index";

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

  it("should export useSchematicCreditBalance composable", () => {
    expect(useSchematicCreditBalance).toBeDefined();
  });
});

// A minimal controllable client that satisfies the methods the credit balance
// composable reads, so we can drive DataStream-style updates without websockets.
const createFakeClient = () => {
  let balances: CreditBalances = {};
  let isPending = true;
  const balanceListeners = new Set<() => void>();
  const pendingListeners = new Set<() => void>();

  return {
    getCreditBalance: (creditId: string) => balances[creditId],
    getCreditBalances: () => balances,
    addCreditBalanceListener: (cb: () => void) => {
      balanceListeners.add(cb);
      return () => balanceListeners.delete(cb);
    },
    getIsPending: () => isPending,
    addIsPendingListener: (cb: () => void) => {
      pendingListeners.add(cb);
      return () => pendingListeners.delete(cb);
    },
    // test-only helpers
    __emitBalances: (next: CreditBalances) => {
      balances = next;
      balanceListeners.forEach((cb) => cb());
    },
    __setPending: (next: boolean) => {
      isPending = next;
      pendingListeners.forEach((cb) => cb());
    },
  };
};

describe("useSchematicCreditBalance", () => {
  const mountBalance = (
    creditId: string,
    client: ReturnType<typeof createFakeClient>,
    opts?: { type?: CreditBalanceType },
  ) => {
    const result: { balance: number; isLoading: boolean } = {
      balance: -1,
      isLoading: false,
    };

    const TestComponent = defineComponent({
      setup() {
        const { balance, isLoading } = useSchematicCreditBalance(
          creditId,
          opts,
        );
        return () => {
          result.balance = balance.value;
          result.isLoading = isLoading.value;
          return h("div");
        };
      },
    });

    const wrapper = mount(TestComponent, {
      global: {
        plugins: [
          [SchematicPlugin, { client: client as unknown as Schematic }],
        ],
      },
    });

    return { wrapper, result };
  };

  it("reports isLoading until a balance is available", () => {
    const client = createFakeClient();
    const { result } = mountBalance("credit-abc", client);

    expect(result).toEqual({ balance: 0, isLoading: true });
  });

  it("surfaces settled as the default headline balance", async () => {
    // Repro from SCH-6526: 6000 grant, lease tracked to 2558. The streamed
    // `remaining` froze at 0 mid-lease; `settled` (spendable) is 3442 — and
    // that's the default the composable returns.
    const client = createFakeClient();
    const { result } = mountBalance("credit-abc", client);

    client.__setPending(false);
    client.__emitBalances({
      "credit-abc": { remaining: 0, reserved: 3442, settled: 3442 },
    });
    await nextTick();

    expect(result).toEqual({ balance: 3442, isLoading: false });
  });

  it("surfaces remaining/reserved when requested via opts.type", async () => {
    const client = createFakeClient();
    const remaining = mountBalance("credit-abc", client, { type: "remaining" });
    const reserved = mountBalance("credit-abc", client, { type: "reserved" });

    client.__setPending(false);
    client.__emitBalances({
      "credit-abc": { remaining: 0, reserved: 3442, settled: 3442 },
    });
    await nextTick();

    expect(remaining.result.balance).toBe(0);
    expect(reserved.result.balance).toBe(3442);
  });

  it("re-renders as credit balance partials arrive", async () => {
    const client = createFakeClient();
    const { result } = mountBalance("credit-abc", client);

    client.__setPending(false);
    client.__emitBalances({
      "credit-abc": { remaining: 3442, reserved: 0, settled: 3442 },
    });
    await nextTick();
    expect(result.balance).toBe(3442);

    // A credit_reserved partial arrives: a lease opens holding 3442. settled
    // stays 3442, so the headline number does not falsely drop.
    client.__emitBalances({
      "credit-abc": { remaining: 0, reserved: 3442, settled: 3442 },
    });
    await nextTick();
    expect(result.balance).toBe(3442);
  });

  it("returns 0 (not loading) for an unknown credit once loaded", async () => {
    const client = createFakeClient();
    const { result } = mountBalance("credit-missing", client);

    client.__setPending(false);
    client.__emitBalances({
      "credit-abc": { remaining: 1, reserved: 0, settled: 1 },
    });
    await nextTick();

    expect(result).toEqual({ balance: 0, isLoading: false });
  });
});
