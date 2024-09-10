import * as SchematicJS from "@schematichq/schematic-js";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

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

export type FlagData = {
  isLoading?: boolean;
  values?: Record<string, boolean>;
};

export interface SchematicContextProps {
  client?: SchematicJS.Schematic;
  flagData: FlagData;
}

export const SchematicContext = createContext<SchematicContextProps>({
  flagData: { isLoading: true, values: {} },
});

export const SchematicProvider: React.FC<SchematicProviderProps> = ({
  children,
  client: providedClient,
  publishableKey,
  ...clientOpts
}) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  const [client, setClient] = useState<SchematicJS.Schematic | undefined>(
    providedClient,
  );
  const clientOptsRef = useRef(clientOpts);
  const { useWebSocket = true } = clientOpts;

  // Create client
  const memoizedClientOpts = useMemo(() => {
    return clientOptsRef.current;
  }, []);

  const createClient = useCallback(() => {
    if (publishableKey) {
      return new SchematicJS.Schematic(publishableKey, {
        ...memoizedClientOpts,
        useWebSocket,
      });
    }
    return undefined;
  }, [publishableKey, memoizedClientOpts, useWebSocket]);

  useEffect(() => {
    if (!providedClient && !client) {
      const newClient = createClient();
      if (newClient) {
        setClient(newClient);
      }
    }

    return () => {
      if (client && !providedClient) {
        client.cleanup().catch((error) => {
          console.error("Error during cleanup:", error);
        });
      }
    };
  }, [providedClient, client, createClient]);

  const flagData = useSyncExternalStore(
    useCallback(
      (callback) => {
        return client?.subscribe(callback) ?? (() => {});
      },
      [client],
    ),
    useCallback(() => {
      return client?.getSnapshot() ?? {};
    }, [client]),
    () => ({}),
  );

  const contextValue = useMemo(() => {
    return { client, flagData };
  }, [client, flagData]);

  return (
    <SchematicContext.Provider value={contextValue}>
      {children}
    </SchematicContext.Provider>
  );
};
