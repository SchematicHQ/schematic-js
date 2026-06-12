import * as SchematicJS from "@schematichq/schematic-js";
import { useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import { SchematicContext } from "../context";

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

export const useSchematic = () => {
  const context = useContext(SchematicContext);

  if (context.client === null) {
    throw new Error("useSchematic must be used within a SchematicProvider");
  }

  return { client: context.client };
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

  const track = useMemo(() => client.track.bind(client), [client]);
  const identify = useMemo(() => client.identify.bind(client), [client]);

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
    (callback: () => void) => client.addPlanListener(callback),
    [client],
  );

  const getSnapshot = useCallback(() => {
    const plan = client.getPlan();

    return plan ?? fallbackPlan;
  }, [client, fallbackPlan]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallbackPlan);
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
