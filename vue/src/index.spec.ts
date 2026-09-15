import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref, type MaybeRefOrGetter } from "vue";
import {
  Schematic,
  type CheckFlagReturn,
  type CreditBalances,
} from "@schematichq/schematic-js";
import {
  SchematicPlugin,
  useSchematicCreditBalance,
  useSchematicEntitlement,
  useSchematicFlag,
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
  let check: CheckFlagReturn | undefined;
  const balanceListeners = new Set<() => void>();
  const pendingListeners = new Set<() => void>();
  const checkListeners = new Set<(check: CheckFlagReturn) => void>();

  return {
    getCreditBalance: (creditId: string) => balances[creditId],
    getCreditBalances: () => balances,
    getFlagCheck: () => check,
    addFlagCheckListener: (
      _key: string,
      cb: (check: CheckFlagReturn) => void,
    ) => {
      checkListeners.add(cb);
      return () => checkListeners.delete(cb);
    },
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
    __emitCheck: (next: CheckFlagReturn) => {
      check = next;
      checkListeners.forEach((cb) => cb(next));
    },
  };
};

describe("useSchematicCreditBalance", () => {
  const mountBalance = (
    creditId: MaybeRefOrGetter<string | undefined>,
    client: ReturnType<typeof createFakeClient>,
  ) => {
    const result: { balance: number; isLoading: boolean } = {
      balance: -1,
      isLoading: false,
    };

    const TestComponent = defineComponent({
      setup() {
        const { balance, isLoading } = useSchematicCreditBalance(creditId);
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

  it("surfaces the settled (spendable) balance", async () => {
    // Repro from SCH-6526: 6000 grant, lease tracked to 2558. The streamed
    // `remaining` froze at 0 mid-lease; `settled` (spendable) is 3442 — and
    // that's what the composable returns.
    const client = createFakeClient();
    const { result } = mountBalance("credit-abc", client);

    client.__setPending(false);
    client.__emitBalances({
      "credit-abc": { remaining: 0, reserved: 3442, settled: 3442 },
    });
    await nextTick();

    expect(result).toEqual({ balance: 3442, isLoading: false });
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

  it("reports isLoading while the credit ID is still undefined", () => {
    // An entitlement's creditId is undefined until the check arrives.
    const client = createFakeClient();
    const { result } = mountBalance(ref(undefined), client);

    expect(result).toEqual({ balance: 0, isLoading: true });
  });

  it("accepts a ref and re-keys when it changes", async () => {
    const client = createFakeClient();
    const creditId = ref<string | undefined>(undefined);
    const { result } = mountBalance(creditId, client);

    client.__setPending(false);
    client.__emitBalances({
      "credit-abc": { remaining: 3442, reserved: 0, settled: 3442 },
      "credit-xyz": { remaining: 10, reserved: 0, settled: 10 },
    });
    await nextTick();
    expect(result.balance).toBe(0);

    creditId.value = "credit-abc";
    await nextTick();
    expect(result).toEqual({ balance: 3442, isLoading: false });

    creditId.value = "credit-xyz";
    await nextTick();
    expect(result.balance).toBe(10);
  });

  it("accepts a getter", async () => {
    const client = createFakeClient();
    const { result } = mountBalance(() => "credit-abc", client);

    client.__setPending(false);
    client.__emitBalances({
      "credit-abc": { remaining: 3442, reserved: 0, settled: 3442 },
    });
    await nextTick();

    expect(result).toEqual({ balance: 3442, isLoading: false });
  });

  it("reads the balance when fed an entitlement's creditId directly", async () => {
    const client = createFakeClient();
    const result = { balance: -1, isLoading: false };

    const TestComponent = defineComponent({
      setup() {
        const { creditId } = useSchematicEntitlement("my-flag-key");
        const { balance, isLoading } = useSchematicCreditBalance(creditId);
        return () => {
          result.balance = balance.value;
          result.isLoading = isLoading.value;
          return h("div");
        };
      },
    });

    mount(TestComponent, {
      global: {
        plugins: [
          [SchematicPlugin, { client: client as unknown as Schematic }],
        ],
      },
    });

    client.__setPending(false);
    client.__emitBalances({
      "credit-abc": { remaining: 0, reserved: 3442, settled: 3442 },
    });
    client.__emitCheck({
      flag: "my-flag-key",
      reason: "Matched plan entitlement",
      value: true,
      creditId: "credit-abc",
    });
    await nextTick();

    expect(result).toEqual({ balance: 3442, isLoading: false });
  });
});

describe("useSchematicEntitlement", () => {
  it("surfaces the credit fields of a credit-metered entitlement", () => {
    const client = createFakeClient();
    client.__emitCheck({
      flag: "my-flag-key",
      reason: "Matched plan entitlement",
      value: true,
      creditId: "credit-abc",
      creditSettled: 3442,
      creditRemaining: 0,
      creditReserved: 3442,
    });

    const result: Record<string, unknown> = {};

    const TestComponent = defineComponent({
      setup() {
        const { creditId, creditSettled, creditRemaining, creditReserved } =
          useSchematicEntitlement("my-flag-key");
        return () => {
          result.creditId = creditId.value;
          result.creditSettled = creditSettled.value;
          result.creditRemaining = creditRemaining.value;
          result.creditReserved = creditReserved.value;
          return h("div");
        };
      },
    });

    mount(TestComponent, {
      global: {
        plugins: [
          [SchematicPlugin, { client: client as unknown as Schematic }],
        ],
      },
    });

    expect(result).toEqual({
      creditId: "credit-abc",
      creditSettled: 3442,
      creditRemaining: 0,
      creditReserved: 3442,
    });
  });

  it("leaves the credit fields undefined for a non-credit entitlement", () => {
    const client = createFakeClient();
    client.__emitCheck({
      flag: "my-flag-key",
      reason: "Matched plan entitlement",
      value: true,
      featureAllocation: 100,
      featureUsage: 10,
    });

    const result: Record<string, unknown> = {};

    const TestComponent = defineComponent({
      setup() {
        const { creditId, creditSettled } =
          useSchematicEntitlement("my-flag-key");
        return () => {
          result.creditId = creditId.value;
          result.creditSettled = creditSettled.value;
          return h("div");
        };
      },
    });

    mount(TestComponent, {
      global: {
        plugins: [
          [SchematicPlugin, { client: client as unknown as Schematic }],
        ],
      },
    });

    expect(result).toEqual({ creditId: undefined, creditSettled: undefined });
  });
});
