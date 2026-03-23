import { useCallback, useMemo } from "react";

import { useSchematicClient, type SchematicHookOpts } from ".";

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
