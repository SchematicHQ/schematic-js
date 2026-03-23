import { useMemo } from "react";
import * as SchematicJS from "@schematichq/schematic-js";

import { useSchematic } from ".";

export interface SchematicHookOpts {
  client: SchematicJS.Schematic;
}

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
