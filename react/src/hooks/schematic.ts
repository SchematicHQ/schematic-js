import * as SchematicJS from "@schematichq/schematic-js";
import { useContext, useEffect, useState } from "react";
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

  return schematic.client;
};

export const useSchematicContext = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);
  const { setContext } = client ?? {};

  return { setContext };
};

export const useSchematicEvents = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);
  const { track, identify } = client ?? {};

  return { track, identify };
};

export const useSchematicIsLoading = () => {
  const { flagData } = useSchematic();
  const { isLoading = true } = flagData;
  return isLoading;
};

export const useSchematicFlag = (key: string, opts?: UseSchematicFlagOpts) => {
  const { flagData, client } = useSchematic();
  const { fallback = false } = opts ?? {};
  const { values = {} } = flagData;

  // Use the flag value from the synchronized store if available
  const flagValue = values[key];

  // Only use local state for the initial fallback and async client.checkFlag
  const [localValue, setLocalValue] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (typeof flagValue === "undefined" && client) {
      client.checkFlag({ key, fallback }).then(setLocalValue);
    }
  }, [key, fallback, flagValue, client]);

  // Prioritize the synchronized flag value, then local value, then fallback
  return typeof flagValue !== "undefined"
    ? flagValue
    : typeof localValue !== "undefined"
      ? localValue
      : fallback;
};
