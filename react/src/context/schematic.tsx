import * as SchematicJS from "@schematichq/schematic-js";
import React, { createContext, useEffect, useMemo, useRef } from "react";

import {
  CompanyProvider,
  type AccessToken,
  type CompanyClient,
  type CompanyData,
} from "../company";
import { type SchematicI18nConfig } from "../i18n";
import { version } from "../version";

type BaseSchematicProviderProps = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
> & {
  children: React.ReactNode;
  /**
   * A temporary access token (or async provider of one) for the company
   * endpoints. Held alongside the publishable key, which keeps serving flags.
   */
  accessToken?: AccessToken;
  /** A company API client; schematic-js supplies one when omitted. */
  companyClient?: CompanyClient;
  /** Prefetched company data, so the first render is complete (SSR). */
  initialData?: CompanyData;
  /**
   * The host's name for the session — a company id, say. A change drops
   * every loaded resource. Needed only when `accessToken` is a provider
   * function; see `CompanyProviderProps`.
   */
  sessionKey?: string | null;
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
  accessToken,
  companyClient,
  children,
  client: providedClient,
  initialData,
  locale,
  onMissingString,
  publishableKey,
  sessionKey,
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

  // The company client is built once per key and reads the access token from
  // its prop (forwarded by CompanyProvider), so a token change resets the
  // company resources without rebuilding the client.
  const { apiUrl, additionalHeaders } = initialOptsRef.current;
  const resolvedCompanyClient = useMemo(
    () =>
      companyClient ??
      new SchematicJS.SchematicCompanyClient({
        accessToken,
        apiUrl,
        additionalHeaders,
      }),
    // The token is forwarded through CompanyProvider's setAccessToken; only
    // the client identity matters here.
    [additionalHeaders, apiUrl, companyClient],
  );

  return (
    <SchematicContext.Provider value={contextValue}>
      <CompanyProvider
        accessToken={accessToken}
        companyClient={resolvedCompanyClient}
        initialData={initialData}
        locale={locale}
        sessionKey={sessionKey}
        strings={strings}
        translate={translate}
        onMissingString={onMissingString}
      >
        {children}
      </CompanyProvider>
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
