import * as SchematicJS from "@schematichq/schematic-js";
import { createContext, useEffect, useMemo, useState } from "react";

type BaseSchematicProviderProps = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey"
> & {
  children: React.ReactNode;
};

type SchematicProviderPropsWithClient = BaseSchematicProviderProps & {
  client: SchematicJS.Schematic;
  publishableKey?: never;
};

type SchematicProviderPropsWithPublishableKey = BaseSchematicProviderProps & {
  client?: never;
  publishableKey: string;
};

export type SchematicProviderProps =
  | SchematicProviderPropsWithClient
  | SchematicProviderPropsWithPublishableKey;

export interface SchematicContextProps {
  client?: SchematicJS.Schematic;
  flagValues: Record<string, boolean>;
}

export const SchematicContext = createContext<SchematicContextProps>({
  flagValues: {},
});

export const SchematicProvider: React.FC<SchematicProviderProps> = ({
  children,
  client: providedClient,
  publishableKey,
  ...clientOpts
}) => {
  const [client, setClient] = useState<SchematicJS.Schematic>();
  const [flagValues, setFlagValues] = useState<Record<string, boolean>>({});
  const memoizedClientOpts = useMemo(
    () => clientOpts,
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [JSON.stringify(clientOpts)],
  );
  const { useWebSocket = true } = clientOpts;

  useEffect(() => {
    let cleanupFunction: (() => void) | undefined;

    // If a client was explicitly provided, always use this
    if (providedClient) {
      setClient(providedClient);
      cleanupFunction = () => {
        providedClient.cleanup().catch((error) => {
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
        newClient.cleanup().catch((error) => {
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
