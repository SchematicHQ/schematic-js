import * as SchematicJS from "@schematichq/schematic-js";
import React, { createContext, useEffect, useMemo, useRef } from "react";

import { version } from "../version";

type BaseSchematicProviderProps = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
> & {
  children: React.ReactNode;
  /**
   * Temporary access token (token_...) or async provider for one, enabling
   * the company-scoped customer APIs (useSubscription, useInvoices,
   * company-mode useCatalog). Unlike other provider props, this is reactive:
   * passing a new value (or a new provider identity, e.g. when the active
   * company changes) swaps the token and drops all company-scoped cached
   * data. Memoize function values (useCallback keyed on the active company) —
   * every new function identity is treated as a company switch and resets
   * cached data. Ignored when `customerClient` is provided.
   */
  accessToken?: SchematicJS.AccessTokenInput;
  /**
   * Bring your own SchematicCustomerClient (e.g. a module singleton shared
   * with non-provider usage) instead of having the provider construct one
   * from publishableKey/accessToken/apiUrl.
   */
  customerClient?: SchematicJS.SchematicCustomerClient;
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
  SchematicProviderPropsWithClient | SchematicProviderPropsWithPublishableKey;

export interface SchematicContextProps {
  client: SchematicJS.Schematic;
  customerClient?: SchematicJS.SchematicCustomerClient;
}

export const SchematicContext = createContext<SchematicContextProps | null>(
  null,
);

export const SchematicProvider: React.FC<SchematicProviderProps> = ({
  children,
  client: providedClient,
  publishableKey,
  accessToken,
  customerClient: providedCustomerClient,
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

  // Latest-value ref so the customer-client memo below can read the current
  // token without depending on its identity: same-mode token swaps must not
  // rebuild the client (that would discard the public cache)
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const hasAccessToken = accessToken !== undefined;

  // The customer client rebuilds during render whenever the token MODE flips
  // (none<->token) or the key changes, so hooks mounting in the same commit
  // see a client in the right mode: a token arriving must not strand
  // auto-mode useCatalog in public mode or make useSubscription throw before
  // an effect could apply it, and a token clearing must not mutate a client
  // that mounted subscribers are still rendering against. Same-mode token
  // swaps are handled by the effect below via setAccessToken, which preserves
  // the public cache. A duplicated older copy of schematic-js in the
  // consumer's node_modules can yield a provided client without the
  // publishableKey getter, hence the fallback chain.
  const customerClient = useMemo(() => {
    if (providedCustomerClient) {
      return providedCustomerClient;
    }
    const resolvedPublishableKey = providedClient
      ? ((providedClient.publishableKey as string | undefined) ??
        publishableKey)
      : publishableKey;
    if (resolvedPublishableKey === undefined && !hasAccessToken) {
      // Nothing to authenticate the customer APIs with; hooks that need the
      // client raise a descriptive error instead
      return undefined;
    }
    return new SchematicJS.SchematicCustomerClient({
      publishableKey: resolvedPublishableKey,
      getAccessToken: accessTokenRef.current,
      apiUrl: initialOptsRef.current.apiUrl,
      clientVersion: `schematic-react@${version}`,
    });
  }, [providedCustomerClient, providedClient, publishableKey, hasAccessToken]);

  // Same-mode token swaps (company switches): swap the credential on the
  // client, which drops company-scoped cached data and refetches in mounted
  // hooks. Mode transitions never reach setAccessToken — the memo above
  // already rebuilt the client with the current token.
  const previousAccessTokenRef = useRef(accessToken);
  useEffect(() => {
    const previous = previousAccessTokenRef.current;
    if (previous === accessToken) {
      return;
    }
    previousAccessTokenRef.current = accessToken;
    if (
      providedCustomerClient === undefined &&
      previous !== undefined &&
      accessToken !== undefined
    ) {
      customerClient?.setAccessToken(accessToken);
    }
  }, [accessToken, customerClient, providedCustomerClient]);

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
      customerClient,
    }),
    [client, customerClient],
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
