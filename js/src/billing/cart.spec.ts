import { CheckoutDraft, type CheckoutTransport } from "./cart";
import type {
  Checkout,
  CheckoutResult,
  CheckoutSelections,
  CheckoutWrite,
} from "./contract";
import type { SessionEvent } from "./session";
import { SchematicApiError } from "./session";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function checkout(overrides: Partial<Checkout> = {}): Checkout {
  return {
    companyId: "comp_a",
    createdAt: new Date(),
    id: "chk_1",
    lastActivityAt: new Date(),
    problems: [],
    selections: {
      addOnIds: [],
      autoTopupOverrides: [],
      creditBundles: [],
      customFieldValues: [],
      intent: "change",
      payInAdvance: [],
      skipTrial: false,
    },
    status: "open",
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  } as Checkout;
}

const result = {
  id: "bilsub_1",
  status: "active",
} as unknown as CheckoutResult;

/** A transport whose every call waits until the test answers it. */
function fakeTransport() {
  const calls: { name: string; args: unknown[]; answer: Deferred<unknown> }[] =
    [];
  const listeners = new Set<(event: SessionEvent) => void>();
  const call =
    <T>(name: string) =>
    (...args: unknown[]): Promise<T> => {
      const answer = deferred<unknown>();
      calls.push({ name, args, answer });
      return answer.promise as Promise<T>;
    };
  const transport: CheckoutTransport = {
    createCheckout: call<CheckoutWrite>("create"),
    getCheckout: call<Checkout>("get"),
    updateCheckout: call<CheckoutWrite>("update"),
    finalizeCheckout: call<CheckoutResult>("finalize"),
  };
  const onSessionChange = (listener: (event: SessionEvent) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  /** Waits for the nth call to be made, then returns it. */
  const nth = async (n: number) => {
    for (let i = 0; i < 50 && calls.length <= n; i++) {
      await Promise.resolve();
    }
    const made = calls[n];
    if (made === undefined) {
      throw new Error(`call ${n} was never made (made ${calls.length})`);
    }
    return made;
  };
  const emit = (event: SessionEvent) => listeners.forEach((l) => l(event));
  return { transport, calls, nth, emit, onSessionChange };
}

const plan = (planId: string): CheckoutSelections => ({
  planId,
  priceId: `${planId}_price`,
});

const conflict = () => new SchematicApiError(409, "/checkouts/chk_1", {});

describe("CheckoutDraft", () => {
  it("opens the checkout on the first write and prices the rest by PUT", async () => {
    const { transport, nth } = fakeTransport();
    const draft = new CheckoutDraft(transport);

    const first = draft.setSelections(plan("a"));
    (await nth(0)).answer.resolve({ checkout: checkout({ version: 1 }) });
    await expect(first).resolves.toMatchObject({ version: 1 });

    const second = draft.setSelections(plan("b"));
    const put = await nth(1);
    expect(put.name).toBe("update");
    expect(put.args).toEqual(["chk_1", 1, plan("b")]);
    put.answer.resolve({ checkout: checkout({ version: 2 }) });
    await expect(second).resolves.toMatchObject({ version: 2 });
    expect(draft.state).toMatchObject({ isPricing: false });
    expect(draft.state.checkout?.version).toBe(2);
  });

  it("opens one checkout for two quick first writes, and sends only the newest cart after it", async () => {
    const { transport, calls, nth } = fakeTransport();
    const draft = new CheckoutDraft(transport);

    const a = draft.setSelections(plan("a"));
    const b = draft.setSelections(plan("b"));
    const c = draft.setSelections(plan("c"));
    expect(draft.state.isPricing).toBe(true);

    const create = await nth(0);
    expect(create.name).toBe("create");
    create.answer.resolve({ checkout: checkout({ version: 1 }) });
    await expect(a).resolves.toMatchObject({ version: 1 });

    const put = await nth(1);
    expect(put.args).toEqual(["chk_1", 1, plan("c")]);
    put.answer.resolve({ checkout: checkout({ version: 2 }) });
    // b was replaced before it was sent; the write that carried c answers it.
    await expect(b).resolves.toMatchObject({ version: 2 });
    await expect(c).resolves.toMatchObject({ version: 2 });
    expect(calls.map((x) => x.name)).toEqual(["create", "update"]);
  });

  it("replays a write once on the current version when another writer moved it", async () => {
    const { transport, nth } = fakeTransport();
    const draft = new CheckoutDraft(transport);
    const first = draft.setSelections(plan("a"));
    (await nth(0)).answer.resolve({ checkout: checkout({ version: 1 }) });
    await first;

    const write = draft.setSelections(plan("b"));
    (await nth(1)).answer.reject(conflict());
    const read = await nth(2);
    expect(read.name).toBe("get");
    read.answer.resolve(checkout({ version: 4 }));
    const replay = await nth(3);
    expect(replay.args).toEqual(["chk_1", 4, plan("b")]);
    replay.answer.resolve({ checkout: checkout({ version: 5 }) });
    await expect(write).resolves.toMatchObject({ version: 5 });
  });

  it("surfaces a second conflict", async () => {
    const { transport, nth } = fakeTransport();
    const draft = new CheckoutDraft(transport);
    const first = draft.setSelections(plan("a"));
    (await nth(0)).answer.resolve({ checkout: checkout({ version: 1 }) });
    await first;

    const write = draft.setSelections(plan("b"));
    (await nth(1)).answer.reject(conflict());
    (await nth(2)).answer.resolve(checkout({ version: 4 }));
    (await nth(3)).answer.reject(conflict());
    await expect(write).rejects.toMatchObject({ status: 409 });
    expect(draft.state.error).toBeInstanceOf(SchematicApiError);
    expect(draft.state.isPricing).toBe(false);
  });

  it("opens a new checkout with the same cart when the old one lapsed", async () => {
    const { transport, nth } = fakeTransport();
    const draft = new CheckoutDraft(transport);
    const first = draft.setSelections(plan("a"));
    (await nth(0)).answer.resolve({ checkout: checkout({ version: 1 }) });
    await first;

    const write = draft.setSelections(plan("b"));
    (await nth(1)).answer.reject(conflict());
    (await nth(2)).answer.resolve(checkout({ status: "expired", version: 3 }));
    const recreate = await nth(3);
    expect(recreate.name).toBe("create");
    expect(recreate.args).toEqual([plan("b")]);
    recreate.answer.resolve({
      checkout: checkout({ id: "chk_2", version: 1 }),
    });
    await expect(write).resolves.toMatchObject({ id: "chk_2" });
    expect(draft.state.checkout?.id).toBe("chk_2");
  });

  it("drops a write that lands after a reset", async () => {
    const { transport, nth } = fakeTransport();
    const draft = new CheckoutDraft(transport);
    const write = draft.setSelections(plan("a"));
    const create = await nth(0);
    draft.reset();
    create.answer.resolve({ checkout: checkout() });
    await expect(write).resolves.toBeUndefined();
    expect(draft.state.checkout).toBeUndefined();
    expect(draft.state.isPricing).toBe(false);
  });

  it("finalizes after every write asked for has landed, under the last session", async () => {
    const { transport, nth } = fakeTransport();
    const draft = new CheckoutDraft(transport);
    void draft.setSelections(plan("a"));
    (await nth(0)).answer.resolve({
      checkout: checkout({ version: 1 }),
      sessionId: "cs_1",
    });
    void draft.setSelections(plan("b"));
    const finalized = draft.finalize();

    const put = await nth(1);
    expect(put.name).toBe("update");
    put.answer.resolve({
      checkout: checkout({ version: 2 }),
      sessionId: "cs_2",
    });

    const finalize = await nth(2);
    expect(finalize.name).toBe("finalize");
    expect(finalize.args).toEqual(["chk_1", 2, { sessionId: "cs_2" }]);
    finalize.answer.resolve(result);
    await expect(finalized).resolves.toBe(result);
    expect(draft.state).toMatchObject({ isFinalizing: false, result });
  });

  it("puts a refused finalize's problems on the state and reads the version it claimed", async () => {
    const { transport, nth } = fakeTransport();
    const draft = new CheckoutDraft(transport);
    void draft.setSelections(plan("a"));
    (await nth(0)).answer.resolve({ checkout: checkout({ version: 1 }) });

    const finalized = draft.finalize();
    const problem = {
      blocking: true,
      code: "payment_method_required",
      message: "Add a payment method to complete this checkout.",
      source: "requirement",
    };
    (await nth(1)).answer.reject(
      new SchematicApiError(400, "/checkouts/chk_1/finalize", {
        error: problem.message,
        problems: [problem],
      }),
    );
    const read = await nth(2);
    expect(read.name).toBe("get");
    read.answer.resolve(checkout({ version: 3 }));
    await expect(finalized).rejects.toMatchObject({ status: 400 });
    expect(draft.state.problems).toEqual([expect.objectContaining(problem)]);
    expect(draft.state.error).toBeUndefined();
    expect(draft.state.checkout?.version).toBe(3);
  });

  it("replays a finalize once on a stale version, but not on a checkout that closed", async () => {
    const { transport, nth } = fakeTransport();
    const draft = new CheckoutDraft(transport);
    void draft.setSelections(plan("a"));
    (await nth(0)).answer.resolve({ checkout: checkout({ version: 1 }) });

    const finalized = draft.finalize();
    (await nth(1)).answer.reject(conflict());
    (await nth(2)).answer.resolve(checkout({ version: 2 }));
    const replay = await nth(3);
    expect(replay.args).toEqual(["chk_1", 2, {}]);
    replay.answer.resolve(result);
    await expect(finalized).resolves.toBe(result);

    const closed = new CheckoutDraft(fakeTransport().transport);
    await expect(closed.finalize()).rejects.toThrow(/no checkout/);
  });

  it("starts over when the session changes to somebody else", async () => {
    const { transport, nth, emit, onSessionChange } = fakeTransport();
    const draft = new CheckoutDraft(transport);
    draft.watchSession(onSessionChange);
    void draft.setSelections(plan("a"));
    (await nth(0)).answer.resolve({ checkout: checkout() });
    await Promise.resolve();
    expect(draft.state.checkout).toBeDefined();

    emit({ type: "changed" });
    expect(draft.state.checkout).toBeUndefined();

    void draft.setSelections(plan("b"));
    expect((await nth(1)).name).toBe("create");
  });

  it("resumes a checkout by id", async () => {
    const { transport, nth } = fakeTransport();
    const draft = new CheckoutDraft(transport, { checkoutId: "chk_9" });
    const loaded = draft.load();
    const read = await nth(0);
    expect(read.args).toEqual(["chk_9"]);
    read.answer.resolve(checkout({ id: "chk_9", version: 7 }));
    await loaded;

    void draft.setSelections(plan("a"));
    expect((await nth(1)).args).toEqual(["chk_9", 7, plan("a")]);
  });
});
