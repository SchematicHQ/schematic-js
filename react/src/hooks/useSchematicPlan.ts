import { useCallback, useMemo, useSyncExternalStore } from "react";
import * as SchematicJS from "@schematichq/schematic-js";

import { useSchematicClient, type SchematicHookOpts } from ".";

export type UseSchematicPlanOpts = SchematicHookOpts & {
  fallback?: SchematicJS.CheckPlanReturn;
};

export const useSchematicPlan = (
  opts?: UseSchematicPlanOpts,
): SchematicJS.CheckPlanReturn | undefined => {
  const client = useSchematicClient(opts);
  const fallback = opts?.fallback;

  const fallbackPlan = useMemo(
    () => fallback,
    [fallback?.id, fallback?.name, fallback?.trialEndDate?.getTime()],
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
