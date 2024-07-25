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

export const useSchematicFlag = (key: string, opts?: UseSchematicFlagOpts) => {
  const { flagValues } = useSchematic();
  const { client } = opts ?? {};
  const { fallback = false } = opts ?? {};

  const [value, setValue] = useState(fallback);
  const flagValue = flagValues[key];

  useEffect(() => {
    if (typeof flagValue !== "undefined") {
      setValue(flagValue);
    } else if (client) {
      client.checkFlag({ key, fallback }).then(setValue);
    } else {
      setValue(fallback);
    }
  }, [key, fallback, flagValue, client]);

  return value;
};
