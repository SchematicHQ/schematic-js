import * as SchematicJS from "@schematichq/schematic-js";
import React from "react";

import {
  SchematicProvider as CoreSchematicProvider,
  type SchematicProviderProps as CoreSchematicProviderProps,
} from "../../core/context";
import type { ConfigurationParameters } from "../api/checkoutexternal";
import type { DeepPartial } from "../types";

import { EmbedProvider } from "./EmbedProvider";
import type { EmbedSettings } from "./embedState";

type CoreOptions = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
>;

interface EmbedProps {
  /**
   * Read-only public REST API key. Defaults to {@link publishableKey} when
   * unset; supply explicitly only if the embed surface should authenticate
   * with a different key from the WS client.
   */
  apiKey?: string;
  /** Extra config for the generated REST clients (fetch, headers, etc.). */
  apiConfig?: ConfigurationParameters;
  /** Theme / layout overrides applied to all embed UI components. */
  settings?: DeepPartial<EmbedSettings>;
  /** Logging flag forwarded to the embed reducer. */
  debug?: boolean;
  /** ISO-4217 codes to restrict currency display. */
  currencyFilter?: string[];
}

type WithChildren = { children: React.ReactNode };

type WithClient = WithChildren &
  CoreOptions &
  EmbedProps & {
    client: SchematicJS.Schematic;
    publishableKey?: never;
  };

type WithPublishableKey = WithChildren &
  CoreOptions &
  EmbedProps & {
    client?: never;
    publishableKey: string;
  };

export type SchematicProviderProps = WithClient | WithPublishableKey;

/**
 * Unified Schematic provider. Combines the websocket-backed flag/entitlement
 * client with the REST-backed embed state in a single tree.
 *
 * Below this provider both `useSchematic*` hooks (from the core surface) and
 * `useEmbed` (and other embed hooks) work simultaneously. The same
 * `publishableKey` is used for both the websocket client and the public REST
 * client unless an explicit `apiKey` override is provided.
 *
 * Lightweight callers who do not need the UI surface should import
 * `SchematicProvider` from `@schematichq/schematic-react2` instead — that
 * bundle has no UI dependencies.
 */
export const SchematicProvider: React.FC<SchematicProviderProps> = ({
  children,
  apiKey,
  apiConfig,
  settings,
  debug,
  currencyFilter,
  ...rest
}) => {
  const embedApiKey =
    apiKey ?? (rest as { publishableKey?: string }).publishableKey;

  return (
    <CoreSchematicProvider {...(rest as CoreSchematicProviderProps)}>
      <EmbedProvider
        apiKey={embedApiKey}
        apiConfig={apiConfig}
        settings={settings}
        debug={debug}
        currencyFilter={currencyFilter}
      >
        {children}
      </EmbedProvider>
    </CoreSchematicProvider>
  );
};
