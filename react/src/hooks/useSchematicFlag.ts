import { useCallback, useSyncExternalStore } from "react";

import { useSchematicClient, type SchematicHookOpts } from ".";

export type UseSchematicFlagOpts = SchematicHookOpts & {
  fallback?: boolean;
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
