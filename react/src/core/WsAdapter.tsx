import * as SchematicJS from "@schematichq/schematic-js";
import React, { useEffect, useMemo, useState } from "react";

import { SchematicContext, type SchematicContextValue } from "../context";
import { version } from "../version";

type CoreOptions = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
>;

export interface WsAdapterProps extends CoreOptions {
  children: React.ReactNode;
  publishableKey?: string;
  client?: SchematicJS.Schematic;
}

/**
 * WS adapter for the unified provider. Constructs a `Schematic` client from
 * `publishableKey` (or accepts a pre-built `client`), provides it via
 * `SchematicContext`, and cleans up the connection on unmount.
 *
 * Mounted as a child of the bare `SchematicProvider` when `ws={WsAdapter}`
 * is supplied — both /core's and /components' wrappers pre-bind this by
 * default. Pass `ws={null}` to the wrapper to opt out (UI-only mode).
 */
export const WsAdapter: React.FC<WsAdapterProps> = ({
  children,
  client: providedClient,
  publishableKey,
  ...clientOpts
}) => {
  // Capture the initial options once. Later prop changes intentionally do
  // not re-construct the client — the WS connection should outlive prop
  // churn.
  const [initialOpts] = useState(() => ({
    publishableKey,
    useWebSocket: true,
    additionalHeaders: {
      "X-Schematic-Client-Version": `schematic-react@${version}`,
    },
    ...clientOpts,
  }));

  const client = useMemo(() => {
    if (providedClient) {
      return providedClient;
    }
    if (!initialOpts.publishableKey) {
      throw new Error(
        "SchematicProvider requires `publishableKey` or `client` when the " +
          "WS adapter is active. Pass `ws={null}` to disable it.",
      );
    }
    return new SchematicJS.Schematic(initialOpts.publishableKey, initialOpts);
  }, [providedClient, initialOpts]);

  useEffect(() => {
    return () => {
      if (!providedClient) {
        client.cleanup().catch((error) => {
          console.error("Error during cleanup:", error);
        });
      }
    };
  }, [client, providedClient]);

  const value = useMemo<SchematicContextValue>(
    () => ({ client, embed: null }),
    [client],
  );

  return (
    <SchematicContext.Provider value={value}>
      {children}
    </SchematicContext.Provider>
  );
};
