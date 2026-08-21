import * as SchematicJS from "@schematichq/schematic-js";
import React, { createContext, useEffect, useMemo, useRef } from "react";

import { version } from "../version";

type BaseSchematicProviderProps = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
> & {
  children: React.ReactNode;
  /**
   * Temporary access token (or async provider of one) for a company-scoped
   * session; unlocks the customer data hooks (useCompany, useInvoices, …).
   * May arrive after mount (e.g. once the user logs in) — the customer
   * client picks it up without losing the anonymous catalog cache.
   */
  accessToken?: SchematicJS.AccessTokenInput;
  /** A preconstructed customer client; accessToken is ignored when set. */
  customerClient?: SchematicJS.SchematicCustomerClient;
  /**
   * Server-prefetched customer data (fetchCatalog, fetchCompany, …) to seed
   * the customer client with, so the first render is complete. Frozen at
   * construction like the other client options.
   */
  initialData?: SchematicJS.CustomerInitialData;
  /**
   * BCP 47 locale the elements format numbers, currency, and dates in;
   * defaults to the browser's navigator.language. Per-element `locale`
   * props override it.
   */
  locale?: string;
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
  /**
   * The customer data client, present when the provider has a publishable
   * key or access token to build one from (or was handed one directly).
   */
  customerClient?: SchematicJS.SchematicCustomerClient;
  /** The provider-level locale, when one was given. */
  locale?: string;
}

export const SchematicContext = createContext<SchematicContextProps | null>(
  null,
);

export const SchematicProvider: React.FC<SchematicProviderProps> = ({
  accessToken,
  children,
  client: providedClient,
  customerClient: providedCustomerClient,
  initialData,
  locale,
  publishableKey,
  ...clientOpts
}) => {
  const initialDataRef = useRef(initialData);
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

  // The customer client is created lazily on the first render that has a
  // credential (the access token often arrives after login), then kept for
  // the provider's lifetime; later token changes are applied through the
  // setAccessToken effect below. Like the analytics client above (whose
  // options freeze in initialOptsRef), publishableKey and the other
  // construction options are frozen at creation — only accessToken is
  // reactive. Construction is side-effect-free, so a discarded
  // StrictMode/concurrent render installing the client is benign; the
  // effect re-applies the committed accessToken either way.
  const customerClientRef = useRef<
    SchematicJS.SchematicCustomerClient | undefined
  >(undefined);
  if (
    providedCustomerClient === undefined &&
    customerClientRef.current === undefined &&
    (publishableKey !== undefined || accessToken !== undefined)
  ) {
    customerClientRef.current = new SchematicJS.SchematicCustomerClient({
      ...(accessToken !== undefined ? { accessToken } : {}),
      ...(initialOptsRef.current.apiUrl !== undefined
        ? { apiUrl: initialOptsRef.current.apiUrl }
        : {}),
      headers: {
        ...initialOptsRef.current.additionalHeaders,
        "X-Schematic-Client-Version": `schematic-react@${version}`,
      },
      ...(initialDataRef.current !== undefined
        ? { initialData: initialDataRef.current }
        : {}),
      ...(publishableKey !== undefined ? { publishableKey } : {}),
    });
  }
  const customerClient = providedCustomerClient ?? customerClientRef.current;

  useEffect(() => {
    if (providedCustomerClient === undefined) {
      customerClientRef.current?.setAccessToken(accessToken);
    }
  }, [accessToken, providedCustomerClient]);

  const contextValue = useMemo<SchematicContextProps>(
    () => ({
      client,
      ...(customerClient !== undefined ? { customerClient } : {}),
      ...(locale !== undefined ? { locale } : {}),
    }),
    [client, customerClient, locale],
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
