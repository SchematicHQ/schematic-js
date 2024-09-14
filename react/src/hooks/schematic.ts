import * as SchematicJS from "@schematichq/schematic-js";
import { useContext, useMemo, useSyncExternalStore } from "react";
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

export const useSchematic = () => useContext(SchematicContext);

export const useSchematicClient = (opts?: SchematicHookOpts) => {
  const schematic = useSchematic();
  const { client } = opts ?? {};

  if (client) {
    return client;
  }

  // TODO: Fix this in types
  return schematic.client as SchematicJS.Schematic;
};

export const useSchematicContext = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);
  const { setContext } = client;
  return { setContext };
};

export const useSchematicEvents = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);
  const { track, identify } = client;
  return { track, identify };
};

export const useSchematicFlag = (key: string, opts?: UseSchematicFlagOpts) => {
  const client = useSchematicClient(opts);
  const fallback = opts?.fallback ?? false;

  const subscribe = useMemo(
    () => (callback: () => void) => client.addFlagValueListener(key, callback),
    [client, key],
  );

  const getSnapshot = useMemo(
    () => () => {
      const value = client.getFlagValue(key);
      return typeof value === "undefined" ? fallback : value;
    },
    [client, key, fallback],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
};

export const useSchematicIsPending = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);

  const subscribe = useMemo(
    () => (callback: () => void) => client.addIsPendingListener(callback),
    [client],
  );

  const getSnapshot = useMemo(() => () => client.getIsPending(), [client]);

  return useSyncExternalStore(subscribe, getSnapshot);
};
