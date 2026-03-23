import { useCallback, useMemo, useSyncExternalStore } from "react";
import * as SchematicJS from "@schematichq/schematic-js";

import { type UseSchematicFlagOpts } from "..";
import { useSchematicClient } from ".";

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
