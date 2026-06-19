import type * as SchematicJS from "@schematichq/schematic-js";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import { SchematicContext } from "../context";
import { SchematicWsDisabledContext, loadWsAdapter } from "../ws-loader";

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

/**
 * Returns the WS client, suspending until it exists. When no client is in
 * context yet (the default — the WS adapter is lazy-loaded on first core-hook
 * use), this throws the adapter's import promise; the Suspense boundary inside
 * the bare provider catches it and re-renders with the adapter mounted. If the
 * consumer opted out with `ws={null}`, lazy-mounting can never happen, so we
 * throw a clear error instead of looping on a Suspense throw.
 */
export const useSchematic = () => {
  const context = useContext(SchematicContext);
  const wsDisabled = useContext(SchematicWsDisabledContext);

  if (context.client === null) {
    if (wsDisabled) {
      throw new Error(
        "useSchematic() called inside a <SchematicProvider ws={null}> tree. " +
          "The WS adapter is explicitly disabled; remove ws={null} (pass " +
          "`publishableKey` or `client`) or pass a `client` via the hook " +
          "options.",
      );
    }
    throw loadWsAdapter();
  }

  return { client: context.client };
};

export const useSchematicClient = (opts?: SchematicHookOpts) => {
  const { client } = opts ?? {};
  // `useSchematic` may suspend; call it unconditionally so the hook order is
  // stable, then prefer an explicitly-provided client when present.
  const schematic = useSchematic();

  return useMemo(() => {
    if (client) {
      return client;
    }

    return schematic.client;
  }, [client, schematic.client]);
};

/**
 * Non-suspending client accessor for the value hooks. Returns the client (from
 * the hook options or context) or `null` while it's still loading. When no
 * client is available yet and the WS adapter isn't disabled, it kicks off the
 * lazy load from an effect — this is what makes the value hooks trigger the
 * adapter import on first use without suspending, preserving their
 * instant-fallback contract.
 */
const useMaybeClient = (
  opts?: SchematicHookOpts,
): SchematicJS.Schematic | null => {
  const context = useContext(SchematicContext);
  const wsDisabled = useContext(SchematicWsDisabledContext);
  const provided = opts?.client;

  useEffect(() => {
    if (!provided && context.client === null && !wsDisabled) {
      void loadWsAdapter();
    }
  }, [provided, context.client, wsDisabled]);

  return provided ?? context.client;
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

  const track = useMemo(() => client.track.bind(client), [client]);
  const identify = useMemo(() => client.identify.bind(client), [client]);

  return useMemo(() => ({ track, identify }), [track, identify]);
};

export const useSchematicFlag = (
  key: string,
  opts?: UseSchematicFlagOpts,
): boolean => {
  const client = useMaybeClient(opts);
  const fallback = opts?.fallback ?? false;

  const subscribe = useCallback(
    (callback: () => void) =>
      client ? client.addFlagValueListener(key, callback) : () => {},
    [client, key],
  );

  const getSnapshot = useCallback(() => {
    if (!client) {
      return fallback;
    }

    const value = client.getFlagValue(key);

    return typeof value === "undefined" ? fallback : value;
  }, [client, key, fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
};

export const useSchematicEntitlement = (
  key: string,
  opts?: UseSchematicFlagOpts,
): SchematicJS.CheckFlagReturn => {
  const client = useMaybeClient(opts);
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
    (callback: () => void) =>
      client ? client.addFlagCheckListener(key, callback) : () => {},
    [client, key],
  );

  const getSnapshot = useCallback(() => {
    if (!client) {
      return fallbackCheck;
    }

    const check = client.getFlagCheck(key);

    return check ?? fallbackCheck;
  }, [client, key, fallbackCheck]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallbackCheck);
};

export const useSchematicPlan = (
  opts?: UseSchematicPlanOpts,
): SchematicJS.CheckPlanReturn | undefined => {
  const client = useMaybeClient(opts);
  const fallback = opts?.fallback;

  const fallbackId = fallback?.id;
  const fallbackName = fallback?.name;
  const fallbackTrialEndTime = fallback?.trialEndDate?.getTime();
  const fallbackTrialStatus = fallback?.trialStatus;

  // Reconstructing the Date from the timestamp inside the memo body keeps
  // `fallbackTrialEndTime` used (eslint-clean) and gives the memo stable
  // identity across renders where the timestamp doesn't change.
  const fallbackPlan = useMemo<SchematicJS.CheckPlanReturn | undefined>(
    () =>
      fallbackId !== undefined && fallbackName !== undefined
        ? {
            id: fallbackId,
            name: fallbackName,
            trialEndDate:
              fallbackTrialEndTime !== undefined
                ? new Date(fallbackTrialEndTime)
                : undefined,
            trialStatus: fallbackTrialStatus,
          }
        : undefined,
    [fallbackId, fallbackName, fallbackTrialEndTime, fallbackTrialStatus],
  );

  const subscribe = useCallback(
    (callback: () => void) =>
      client ? client.addPlanListener(callback) : () => {},
    [client],
  );

  const getSnapshot = useCallback(() => {
    if (!client) {
      return fallbackPlan;
    }

    const plan = client.getPlan();

    return plan ?? fallbackPlan;
  }, [client, fallbackPlan]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallbackPlan);
};

export const useSchematicIsPending = (opts?: SchematicHookOpts) => {
  const client = useMaybeClient(opts);

  const subscribe = useCallback(
    (callback: () => void) =>
      client ? client.addIsPendingListener(callback) : () => {},
    [client],
  );

  const getSnapshot = useCallback(
    () => (client ? client.getIsPending() : true),
    [client],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => true);
};
