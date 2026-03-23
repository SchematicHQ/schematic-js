import { useEffect, useMemo, useRef } from "react";
import * as SchematicJS from "@schematichq/schematic-js";

import { version } from "../version";
import { SchematicContext, type SchematicContextProps } from ".";

type BaseSchematicProviderProps = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
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

export const SchematicProvider = ({
  children,
  client: providedClient,
  publishableKey,
  ...clientOpts
}: SchematicProviderProps) => {
  const initialOptsRef = useRef({
    publishableKey,
    useWebSocket: true,
    additionalHeaders: {
      "X-Schematic-Client-Version": `schematic-react@${version}`,
    },
    ...clientOpts,
  });

  const client = useMemo(() => {
    if (providedClient) {
      return providedClient;
    }

    return new SchematicJS.Schematic(initialOptsRef.current.publishableKey!, {
      ...initialOptsRef.current,
    });
  }, [providedClient]);

  useEffect(() => {
    // Clean up Schematic client (i.e., close websocket connection) when the
    // component is unmounted
    return () => {
      // If the client was provided as an option, we don't need to clean it up;
      // assume whoever provided it will clean it up
      if (!providedClient) {
        client.cleanup().catch((error) => {
          console.error("Error during cleanup:", error);
        });
      }
    };
  }, [client, providedClient]);

  const contextValue = useMemo<SchematicContextProps>(
    () => ({ client }),
    [client],
  );

  return (
    <SchematicContext.Provider value={contextValue}>
      {children}
    </SchematicContext.Provider>
  );
};
