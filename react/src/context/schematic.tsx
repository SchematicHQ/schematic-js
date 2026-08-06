import * as SchematicJS from "@schematichq/schematic-js";
import React, { createContext, useEffect, useMemo, useRef } from "react";

import { version } from "../version";

type BaseSchematicProviderProps = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
> & {
  children: React.ReactNode;
  /**
   * Temporary access token (token_...) or async resolver for one, enabling
   * the checkout APIs. Unlike other provider props, this is reactive: passing
   * a new value (or a new resolver identity, e.g. when the active company
   * changes) rebuilds the checkout client and drops the cached token.
   */
  accessToken?: SchematicJS.AccessTokenInput;
  /** Overrides (base URL, headers, fetch) applied to the generated API clients */
  apiConfig?: SchematicJS.SchematicApiConfig;
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
  client: SchematicJS.Schematic;
  api: SchematicJS.SchematicApi;
}

export const SchematicContext = createContext<SchematicContextProps | null>(
  null,
);

export const SchematicProvider: React.FC<SchematicProviderProps> = ({
  children,
  client: providedClient,
  publishableKey,
  accessToken,
  apiConfig,
  ...clientOpts
}) => {
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

  // One store for the provider's lifetime, so cached query data survives
  // rebuilds of the API clients (e.g. accessToken changes)
  const queryStore = useMemo(() => new SchematicJS.QueryStore(), []);

  // A duplicated older copy of schematic-js in the consumer's node_modules
  // can yield a client without the publishableKey getter; fall back rather
  // than silently disabling the public APIs
  const resolvedPublishableKey = providedClient
    ? ((providedClient.publishableKey as string | undefined) ?? publishableKey)
    : publishableKey;

  // Stabilized so inline `apiConfig` object literals don't rebuild the
  // clients every render; fetchApi is a function and is deliberately
  // excluded from the comparison
  const apiConfigKey = JSON.stringify(apiConfig ?? null);
  const api = useMemo(
    () =>
      SchematicJS.createSchematicApi({
        publishableKey: resolvedPublishableKey,
        accessToken,
        apiConfig,
        clientVersion: `schematic-react@${version}`,
        queryStore,
      }),
    [resolvedPublishableKey, accessToken, apiConfigKey, queryStore],
  );

  // The access token is the credential scoping company-specific data; when it
  // changes (e.g. the active company switched), data cached under the old
  // credential must not survive the swap. remove() also disowns in-flight
  // requests and prompts mounted queries to refetch.
  const previousAccessTokenRef = useRef(accessToken);
  useEffect(() => {
    if (previousAccessTokenRef.current === accessToken) {
      return;
    }
    previousAccessTokenRef.current = accessToken;
    queryStore.remove();
  }, [accessToken, queryStore]);

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
    () => ({
      client,
      api,
    }),
    [client, api],
  );

  return (
    <SchematicContext.Provider value={contextValue}>
      {children}
    </SchematicContext.Provider>
  );
};

export const useSchematic = () => {
  const context = React.useContext(SchematicContext);
  if (context === null) {
    throw new Error("useSchematic must be used within a SchematicProvider");
  }
  return context;
};
