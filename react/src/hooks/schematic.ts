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

  const track = useCallback(
    (...args: Parameters<typeof client.track>) => client.track(...args),
    [client],
  );

  const identify = useCallback(
    (...args: Parameters<typeof client.identify>) => client.identify(...args),
    [client],
  );

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

  return useSyncExternalStore(subscribe, getSnapshot);
};

export const useSchematicFlagCheck = (
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

  return useSyncExternalStore(subscribe, getSnapshot);
};

export const useSchematicIsPending = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);

  const subscribe = useCallback(
    (callback: () => void) => client.addIsPendingListener(callback),
    [client],
  );

  const getSnapshot = useCallback(() => client.getIsPending(), [client]);

  return useSyncExternalStore(subscribe, getSnapshot);
};
