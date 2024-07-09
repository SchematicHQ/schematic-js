import * as SchematicJS from "@schematichq/schematic-js";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export interface SchematicFlags {
  [key: string]: boolean;
}

type BaseSchematicProviderProps = Omit<SchematicJS.SchematicOptions, 'client' | 'publishableKey'> & {
  children: ReactNode;
};

type SchematicProviderPropsWithClient = BaseSchematicProviderProps & {
  client: SchematicJS.Schematic;
  publishableKey?: never;
};

type SchematicProviderPropsWithPublishableKey = BaseSchematicProviderProps & {
  client?: never;
  publishableKey: string;
};

type SchematicProviderProps = SchematicProviderPropsWithClient | SchematicProviderPropsWithPublishableKey;

interface SchematicContextProps {
  client?: SchematicJS.Schematic;
  flagValues: Record<string, boolean>;
}

interface SchematicHookOpts {
  client?: SchematicJS.Schematic;
}

type UseSchematicFlagOpts = SchematicHookOpts & {
  fallback?: boolean;
};

const SchematicContext = createContext<SchematicContextProps>({
  flagValues: {},
});

const SchematicProvider: React.FC<SchematicProviderProps> = ({
  children,
  client: providedClient,
  publishableKey,
  ...clientOpts
}) => {
  const [client, setClient] = useState<SchematicJS.Schematic>();
  const [flagValues, setFlagValues] = useState<Record<string, boolean>>({});
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const memoizedClientOpts = useMemo(() => clientOpts, [JSON.stringify(clientOpts)]);
  const { useWebSocket = true } = clientOpts;

  useEffect(() => {
    let cleanupFunction: (() => void) | undefined;

    // If a client was explicitly provided, always use this
    if (providedClient) {
      setClient(providedClient);
      cleanupFunction = () => {
        providedClient.cleanup().catch(error => {
          console.error("Error during cleanup:", error);
        });
      };
    } else {
      // Otherwise, if a publishable key was provided, create a new client
      // with the client options
      const newClient = new SchematicJS.Schematic(publishableKey, {
        ...memoizedClientOpts,
        flagListener: setFlagValues,
        useWebSocket,
      });
      setClient(newClient);
      cleanupFunction = () => {
        newClient.cleanup().catch(error => {
          console.error("Error during cleanup:", error);
        });
      };
    }

    // Return the cleanup function
    return cleanupFunction;
  }, [memoizedClientOpts, providedClient, publishableKey, useWebSocket]);

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

export {
  SchematicProvider,
  useSchematic,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
};

export type { SchematicHookOpts, SchematicProviderProps, UseSchematicFlagOpts };

export { Schematic } from "@schematichq/schematic-js";

export type {
  Event,
  EventBody,
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
