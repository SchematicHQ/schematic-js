import * as SchematicJS from "@schematichq/schematic-js";
import React, { createContext, useEffect, useMemo, useRef } from "react";

import {
  CatalogProvider,
  type AccessToken,
  type CatalogClient,
  type CatalogData,
} from "../catalog";
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
  /** A catalog API client; schematic-js supplies one when omitted. */
  catalogClient?: CatalogClient;
  /** Prefetched catalog data, so the first render is complete (SSR). */
  initialData?: CatalogData;
  /** BCP 47 tag the elements format in; defaults to the viewer's language. */
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
}

export const SchematicContext = createContext<SchematicContextProps | null>(
  null,
);

export const SchematicProvider: React.FC<SchematicProviderProps> = ({
  accessToken,
  catalogClient,
  children,
  client: providedClient,
  initialData,
  locale,
  publishableKey,
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

  return (
    <SchematicContext.Provider value={contextValue}>
      <CatalogProvider
        accessToken={accessToken}
        catalogClient={catalogClient}
        initialData={initialData}
        locale={locale}
      >
        {children}
      </CatalogProvider>
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
