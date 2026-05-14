import * as SchematicJS from "@schematichq/schematic-js";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { SchematicContext, type SchematicContextValue } from "../context";
import type { SchematicAdapterProps } from "../provider";
import { version } from "../version";

type CoreOptions = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
>;

// Lookup-based read so the source compiles in both prod (with the ambient
// `process` declaration) and the test config (where it's not in scope).
// The consumer's bundler replaces this string at build time and dead-code
// eliminates the warn branch in production.
function isProductionEnv(): boolean {
  const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
    .process;
  return proc?.env?.NODE_ENV === "production";
}

/**
 * Props the `WsAdapter` actually consumes. Typed as the full shared
 * `SchematicAdapterProps` (plus CoreOptions) so the bare provider can pass
 * the adapter through `createElement` without a cast — the unused embed
 * keys are stripped upstream by `pickWsProps`.
 */
export type WsAdapterProps = SchematicAdapterProps & CoreOptions;

/**
 * WS adapter for the unified provider. Constructs a `Schematic` client from
 * `publishableKey` (or accepts a pre-built `client`), provides it via
 * `SchematicContext`, and cleans up the connection on unmount.
 *
 * Mounted as a child of the bare `SchematicProvider` when `ws={WsAdapter}`
 * is supplied — both the root and /components entries' wrappers pre-bind
 * this by default. Pass `ws={null}` to the wrapper to opt out (UI-only
 * mode).
 *
 * The `publishableKey`/`client`/CoreOptions are captured on first mount;
 * later prop changes do not re-construct the client (the WS connection
 * should outlive prop churn). In non-production builds we warn when a
 * credential changes after mount so the silent-no-op doesn't go unnoticed.
 */
export const WsAdapter: React.FC<WsAdapterProps> = ({
  children,
  client: providedClient,
  publishableKey,
  // The bare provider's `pickWsProps` strips these, but if a consumer
  // composes the adapter directly (e.g. in tests) we destructure them off
  // so they don't end up in the SchematicOptions spread.
  apiConfig: _apiConfig,
  settings: _settings,
  debug: _debug,
  currencyFilter: _currencyFilter,
  ...clientOpts
}) => {
  const [initialOpts] = useState(() => ({
    publishableKey,
    useWebSocket: true,
    additionalHeaders: {
      "X-Schematic-Client-Version": `schematic-react@${version}`,
    },
    ...clientOpts,
  }));

  // Dev-mode warning: surface silent no-ops when a consumer changes the
  // credential after mount. The check runs inside the effect (not around
  // the hook call) so it's well-behaved for rules-of-hooks; the consumer's
  // bundler is expected to replace `process.env.NODE_ENV` with
  // "production", letting their minifier drop the body in prod builds.
  const initialKeyRef = useRef(publishableKey);
  const initialClientRef = useRef(providedClient);
  useEffect(() => {
    if (isProductionEnv()) return;
    if (publishableKey !== initialKeyRef.current) {
      console.warn(
        "[SchematicProvider] publishableKey changed after mount; the WS " +
          "client was constructed with the initial value and will not be " +
          "rebuilt. Remount the provider (e.g. with a `key` prop) to use " +
          "a new credential.",
      );
    }
    if (providedClient !== initialClientRef.current) {
      console.warn(
        "[SchematicProvider] `client` prop changed after mount; the WS " +
          "adapter is still bound to the initial client. Remount the " +
          "provider to switch instances.",
      );
    }
  }, [publishableKey, providedClient]);

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
