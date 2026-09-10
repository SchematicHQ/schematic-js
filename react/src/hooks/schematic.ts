import * as SchematicJS from "@schematichq/schematic-js";
import { useMemo, useSyncExternalStore, useCallback } from "react";
import { useSchematic } from "../context";

export interface SchematicFlags {
  [key: string]: boolean;
}

export interface SchematicHookOpts {
  client?: SchematicJS.Schematic;
}

export type UseSchematicFlagOpts = SchematicHookOpts & {
  fallback?: boolean;
};

export type UseSchematicPlanOpts = SchematicHookOpts & {
  fallback?: SchematicJS.CheckPlanReturn;
};

/** A company's credit balance for a single credit type, plus a loading flag */
export type SchematicCreditBalance = {
  /** The spendable balance; 0 while loading or when the company holds no balance in this credit */
  balance: number;
  /** True while the balance is still loading and no value has arrived yet */
  isLoading: boolean;
};

export const useSchematicClient = (opts?: SchematicHookOpts) => {
  const schematic = useSchematic();
  const { client } = opts ?? {};

  return useMemo(() => {
    if (client) {
      return client;
    }
    return schematic.client;
  }, [client, schematic.client]);
};

export const useSchematicContext = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);
  return useMemo(
    () => ({
      setContext: client.setContext.bind(client),
    }),
    [client],
  );
};

export const useSchematicEvents = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);

  // The compiler cannot prove a rest-spread forward preserves the memo, so it
  // declines to optimize the hook rather than change it. The identities still
  // hold across renders, which is what callers depend on. Rewriting these as
  // `client.track.bind(client)` — the shape `useSchematicContext` uses — would
  // satisfy the rule, but that is the events API's call to make, not a lint
  // sweep's.
  /* eslint-disable react-hooks/preserve-manual-memoization */
  const track = useCallback(
    (...args: Parameters<typeof client.track>) => client.track(...args),
    [client],
  );

  const identify = useCallback(
    (...args: Parameters<typeof client.identify>) => client.identify(...args),
    [client],
  );
  /* eslint-enable react-hooks/preserve-manual-memoization */

  return useMemo(() => ({ track, identify }), [track, identify]);
};

export const useSchematicFlag = (
  key: string,
  opts?: UseSchematicFlagOpts,
): boolean => {
  const client = useSchematicClient(opts);
  const fallback = opts?.fallback ?? false;

  const subscribe = useCallback(
    (callback: () => void) => client.addFlagValueListener(key, callback),
    [client, key],
  );

  const getSnapshot = useCallback(() => {
    const value = client.getFlagValue(key);
    return typeof value === "undefined" ? fallback : value;
  }, [client, key, fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
};

export const useSchematicEntitlement = (
  key: string,
  opts?: UseSchematicFlagOpts,
): SchematicJS.CheckFlagReturn => {
  const client = useSchematicClient(opts);
  const fallback = opts?.fallback ?? false;

  const fallbackCheck = useMemo(
    () => ({
      flag: key,
      reason: "Fallback",
      value: fallback,
    }),
    [key, fallback],
  );

  const subscribe = useCallback(
    (callback: () => void) => client.addFlagCheckListener(key, callback),
    [client, key],
  );

  const getSnapshot = useCallback(() => {
    const check = client.getFlagCheck(key);
    return check ?? fallbackCheck;
  }, [client, key, fallbackCheck]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallbackCheck);
};

export const useSchematicPlan = (
  opts?: UseSchematicPlanOpts,
): SchematicJS.CheckPlanReturn | undefined => {
  const client = useSchematicClient(opts);
  const fallback = opts?.fallback;

  // Extracted so the dependency list stays statically checkable.
  const fallbackTrialEnd = fallback?.trialEndDate?.getTime();
  // Keyed on the fallback's fields rather than the fallback itself: a host
  // writing `fallback={{ ... }}` inline hands over a new object every render,
  // and depending on it would hand `useSyncExternalStore` a new server
  // snapshot each time — which is the loop this memo exists to prevent.
  const fallbackPlan = useMemo(
    () => fallback,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fallback?.id, fallback?.name, fallbackTrialEnd, fallback?.trialStatus],
  );

  const subscribe = useCallback(
    (callback: () => void) => client.addPlanListener(callback),
    [client],
  );

  const getSnapshot = useCallback(() => {
    const plan = client.getPlan();
    return plan ?? fallbackPlan;
  }, [client, fallbackPlan]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallbackPlan);
};

/**
 * Returns a company's live, lease-aware credit balance for a single credit type.
 *
 * Surfaces the spendable `settled` balance, sourced from the streamed
 * `credit_balances` map (keyed by credit ID). It re-renders as partials arrive
 * over the DataStream, so it stays accurate during an open lease — when the raw
 * `remaining` would otherwise read stale / falsely "exhausted".
 */
export const useSchematicCreditBalance = (
  creditId: string,
  opts?: SchematicHookOpts,
): SchematicCreditBalance => {
  const client = useSchematicClient(opts);

  const subscribe = useCallback(
    (callback: () => void) => client.addCreditBalanceListener(callback),
    [client],
  );

  const getSnapshot = useCallback(
    () => client.getCreditBalance(creditId),
    [client, creditId],
  );

  const balance = useSyncExternalStore(subscribe, getSnapshot, () => undefined);

  const isPendingSubscribe = useCallback(
    (callback: () => void) => client.addIsPendingListener(callback),
    [client],
  );

  const isPending = useSyncExternalStore(
    isPendingSubscribe,
    () => client.getIsPending(),
    () => true,
  );

  return useMemo(
    () => ({
      balance: balance?.settled ?? 0,
      isLoading: balance === undefined && isPending,
    }),
    [balance, isPending],
  );
};

export const useSchematicIsPending = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);

  const subscribe = useCallback(
    (callback: () => void) => client.addIsPendingListener(callback),
    [client],
  );

  const getSnapshot = useCallback(() => client.getIsPending(), [client]);

  return useSyncExternalStore(subscribe, getSnapshot, () => true);
};
