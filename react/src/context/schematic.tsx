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
   * data. Ignored when `customerClient` is provided.
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

  // Like the flag client, the customer client is constructed once from the
  // mount-time props; only accessToken is reactive (handled below). A
  // duplicated older copy of schematic-js in the consumer's node_modules can
  // yield a provided client without the publishableKey getter, hence the
  // fallback chain.
  const initialAccessTokenRef = useRef(accessToken);
  const customerClient = useMemo(() => {
    if (providedCustomerClient) {
      return providedCustomerClient;
    }
    const resolvedPublishableKey = providedClient
      ? ((providedClient.publishableKey as string | undefined) ??
        publishableKey)
      : publishableKey;
    if (
      resolvedPublishableKey === undefined &&
      initialAccessTokenRef.current === undefined
    ) {
      // Nothing to authenticate the customer APIs with; hooks that need the
      // client raise a descriptive error instead
      return undefined;
    }
    return new SchematicJS.SchematicCustomerClient({
      publishableKey: resolvedPublishableKey,
      getAccessToken: initialAccessTokenRef.current,
      apiUrl: initialOptsRef.current.apiUrl,
      clientVersion: `schematic-react@${version}`,
    });
  }, [providedCustomerClient, providedClient, publishableKey]);

  // The access token is the credential scoping company-specific data; when it
  // changes (e.g. the active company switched), swap it on the client — which
  // also drops all company-scoped cached data and refetches in mounted hooks.
  const previousAccessTokenRef = useRef(accessToken);
  useEffect(() => {
    if (previousAccessTokenRef.current === accessToken) {
      return;
    }
    previousAccessTokenRef.current = accessToken;
    if (providedCustomerClient === undefined) {
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
