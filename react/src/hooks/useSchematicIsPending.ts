import { useCallback, useSyncExternalStore } from "react";

import { useSchematicClient, type SchematicHookOpts } from ".";

export const useSchematicIsPending = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);

  const subscribe = useCallback(
    (callback: () => void) => client.addIsPendingListener(callback),
    [client],
  );

  const getSnapshot = useCallback(() => client.getIsPending(), [client]);

  return useSyncExternalStore(subscribe, getSnapshot, () => true);
};
