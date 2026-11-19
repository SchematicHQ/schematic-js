import type {
  CreditBalances,
  CreditSpendPolicy,
  Schematic,
} from "@schematichq/schematic-react";

import { daysFromNow, nextId } from "./builders";

export function streamSpendPolicy(
  overrides: Partial<CreditSpendPolicy> = {},
): CreditSpendPolicy {
  return {
    consumed: 44,
    creditId: "bcr_ai",
    id: nextId("csp"),
    kind: "window",
    limit: 50,
    resetsAt: daysFromNow(0.25),
    scope: "user",
    window: { count: 1, unit: "day" },
    ...overrides,
  };
}

export interface FakeStreamClient {
  client: Schematic;
  emitBalances: (balances: CreditBalances) => void;
  emitPolicies: (policies: CreditSpendPolicy[]) => void;
  setPending: (pending: boolean) => void;
}

/**
 * A DataStream client for `SchematicProvider client={…}` that holds what it
 * is handed and never connects.
 */
export function fakeStreamClient(
  initial: {
    balances?: CreditBalances;
    policies?: CreditSpendPolicy[];
    pending?: boolean;
  } = {},
): FakeStreamClient {
  let balances = initial.balances ?? {};
  let policies = initial.policies ?? [];
  let pending = initial.pending ?? false;
  const listeners = {
    balance: new Set<() => void>(),
    pending: new Set<() => void>(),
    policy: new Set<() => void>(),
  };
  const listen = (set: Set<() => void>) => (callback: () => void) => {
    set.add(callback);
    return () => {
      set.delete(callback);
    };
  };
  const notify = (set: Set<() => void>) =>
    set.forEach((callback) => callback());

  const client = {
    addCreditBalanceListener: listen(listeners.balance),
    addCreditSpendPolicyListener: listen(listeners.policy),
    addIsPendingListener: listen(listeners.pending),
    cleanup: () => Promise.resolve(),
    getCreditBalance: (creditId: string) => balances[creditId],
    getCreditBalances: () => balances,
    getCreditSpendPolicies: () => policies,
    getIsPending: () => pending,
  };

  return {
    client: client as unknown as Schematic,
    emitBalances: (next) => {
      balances = next;
      notify(listeners.balance);
    },
    emitPolicies: (next) => {
      policies = next;
      notify(listeners.policy);
    },
    setPending: (next) => {
      pending = next;
      notify(listeners.pending);
    },
  };
}
