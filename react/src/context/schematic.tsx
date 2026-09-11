import * as SchematicJS from "@schematichq/schematic-js";
import React, { createContext, useEffect, useMemo, useRef } from "react";

import {
  BillingProvider,
  type BillingClient,
  type BillingData,
  type SessionInput,
} from "../billing";
import { type SchematicI18nConfig } from "../i18n";
import { version } from "../version";

type BaseSchematicProviderProps = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
> & {
  children: React.ReactNode;
  /**
   * The billing session: which (company, user) pair the `/company/*`
   * endpoints are read for and the credential for it, `null` when nobody is
   * signed in, and `undefined` while the host is finding out. Held alongside
   * the publishable key, which keeps serving flags.
   */
  session?: SessionInput;
  /** A billing client; schematic-js supplies one when omitted. */
  billingClient?: BillingClient;
  /** Prefetched billing data, so the first render is complete (SSR). */
  initialData?: BillingData;
} & SchematicI18nConfig;

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
}

export const SchematicContext = createContext<SchematicContextProps | null>(
  null,
);

export const SchematicProvider: React.FC<SchematicProviderProps> = ({
  session,
  billingClient,
  children,
  client: providedClient,
  initialData,
  locale,
  onMissingString,
  publishableKey,
  strings,
  translate,
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
    }),
    [client],
  );

  const { apiUrl, additionalHeaders } = initialOptsRef.current;
  // The API the host's client reads from, not the client itself. Keying on
  // the object would rebuild this — and with it the store, which holds every
  // loaded row — each time a host wrote `client={new Schematic(...)}` inline,
  // where a new object every render says nothing new. Where the requests go
  // is what a rebuild is for.
  const providedApiUrl = providedClient?.apiUrl;
  const resolvedBillingClient = useMemo(
    () =>
      billingClient ??
      new SchematicJS.SchematicBillingClient({
        session,
        apiUrl: apiUrl ?? providedApiUrl,
        // Read as they stand when a client is built: headers do not change
        // where the token goes, so they are no reason to build one.
        additionalHeaders: {
          ...providedClient?.additionalHeaders,
          ...additionalHeaders,
        },
      }),
    // `session` is deliberately absent: `BillingProvider` forwards it through
    // `setSession`, so a token change resets the billing resources without
    // rebuilding the client.
    [additionalHeaders, apiUrl, billingClient, providedApiUrl],
  );

  return (
    <SchematicContext.Provider value={contextValue}>
      <BillingProvider
        billingClient={resolvedBillingClient}
        initialData={initialData}
        locale={locale}
        session={session}
        strings={strings}
        translate={translate}
        onMissingString={onMissingString}
      >
        {children}
      </BillingProvider>
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
