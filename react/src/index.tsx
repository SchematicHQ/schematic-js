import * as SchematicJS from "@schematichq/schematic-js";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export interface SchematicFlags {
  [key: string]: boolean;
}

interface SchematicProviderProps {
  children: ReactNode;
  client?: SchematicJS.Schematic;
  clientOpts?: SchematicJS.SchematicOptions;
  publishableKey?: string;
}

interface SchematicContextProps {
  client?: SchematicJS.Schematic;
  flagValues: Record<string, boolean>;
}

interface SchematicHookOpts {
  client?: SchematicJS.Schematic;
}

type UseSchematicFlagOpts = SchematicHookOpts & {
  fallback?: boolean;
}

const SchematicContext = createContext<SchematicContextProps>({
  flagValues: {},
});


const SchematicProvider: React.FC<SchematicProviderProps> = ({
  children,
  client: providedClient,
  clientOpts,
  publishableKey,
}) => {
  const [client, setClient] = useState<SchematicJS.Schematic | undefined>();
  const [flagValues, setFlagValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // If a client was explicitly provided, always use this
    if (providedClient) {
      setClient(providedClient);
      return providedClient.cleanup;
    }

    // Otherwise, if a publishable key was provided, create a new client
    // with the client options
    if (publishableKey === undefined) {
      return;
    }

    const newClient = new SchematicJS.Schematic(publishableKey, {
      ...clientOpts,
      flagListener: setFlagValues,
      useWebSocket: true,
    });
    setClient(newClient);
    return newClient.cleanup;
  }, [clientOpts, providedClient, publishableKey]);

  const contextValue: SchematicContextProps = {
    client,
    flagValues,
  };

  return (
    <SchematicContext.Provider value={contextValue}>
      {children}
    </SchematicContext.Provider>
  );
};

const useSchematic = () => useContext(SchematicContext);

const useSchematicClient = (opts?: SchematicHookOpts) => {
  const schematic = useSchematic();
  const { client } = opts ?? {};

  if (client) {
    return client;
  }

  return schematic.client;
};

const useSchematicContext = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);
  const { setContext } = client ?? {};

  return { setContext };
};

const useSchematicEvents = (opts?: SchematicHookOpts) => {
  const client = useSchematicClient(opts);
  const { track, identify } = client ?? {};

  return { track, identify };
};

const useSchematicFlag = (key: string, opts?: UseSchematicFlagOpts) => {
  const { flagValues } = useSchematic();
  const { client } = opts ?? {};
  const { fallback = false } = opts ?? {};

  const [value, setValue] = useState(fallback ?? false);
  const flagValue = flagValues[key];

  useEffect(() => {
    typeof flagValue === "undefined"
      ? setValue(fallback)
      : setValue(flagValue);
  }, [key, fallback, flagValue]);

  useEffect(() => {
    if (!client) return;

    client.checkFlag({ key, fallback }).then((value) => {
      setValue(value);
    });
  }, [client, key, fallback]);

  return value;
};

export {
  SchematicProvider,
  useSchematic,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
};

export type {
  SchematicHookOpts,
  SchematicProviderProps,
  UseSchematicFlagOpts,
}

export {
  Schematic,
} from "@schematichq/schematic-js";

export type {
  Event,
  EventBody,
  EventBodyCompany,
  EventBodyIdentify,
  EventBodyTrack,
  EventType,
  FlagCheckResponseBody,
  FlagCheckWithKeyResponseBody,
  Keys,
  SchematicOptions,
  SchematicContext,
  Traits,
} from "@schematichq/schematic-js";
