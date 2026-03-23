import { useMemo } from "react";

import { type SchematicHookOpts } from "..";
import { useSchematicClient } from ".";

export const useSchematicContext = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);

  return useMemo(
    () => ({ setContext: client.setContext.bind(client) }),
    [client],
  );
};
