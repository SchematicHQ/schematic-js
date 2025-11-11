import * as SchematicJS from "@schematichq/schematic-js";
import { App, InjectionKey, inject, onScopeDispose } from "vue";
import { version } from "../version";

type BaseSchematicPluginOptions = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey"
>;

type SchematicPluginOptionsWithClient = BaseSchematicPluginOptions & {
  client: SchematicJS.Schematic;
  publishableKey?: never;
};

type SchematicPluginOptionsWithPublishableKey = BaseSchematicPluginOptions & {
  client?: never;
  publishableKey: string;
};

export type SchematicPluginOptions =
  | SchematicPluginOptionsWithClient
  | SchematicPluginOptionsWithPublishableKey;

export interface SchematicContextValue {
  client: SchematicJS.Schematic;
}

export const SchematicSymbol: InjectionKey<SchematicContextValue> =
  Symbol("schematic");

/**
 * Vue plugin for Schematic
 * Install this plugin to make Schematic available throughout your Vue app
 *
 * @example
 * ```typescript
 * import { createApp } from 'vue'
 * import { SchematicPlugin } from '@schematichq/schematic-vue'
 *
 * const app = createApp(App)
 * app.use(SchematicPlugin, { publishableKey: 'your-publishable-key' })
 * ```
 */
export const SchematicPlugin = {
  install(app: App, options: SchematicPluginOptions) {
    let client: SchematicJS.Schematic;

    if ("client" in options && options.client) {
      client = options.client;
    } else if ("publishableKey" in options && options.publishableKey) {
      const { publishableKey, ...clientOpts } = options;
      client = new SchematicJS.Schematic(publishableKey, {
        useWebSocket: clientOpts.useWebSocket ?? true,
        additionalHeaders: {
          "X-Schematic-Client-Version": `schematic-vue@${version}`,
        },
        ...clientOpts,
      });
    } else {
      throw new Error(
        "SchematicPlugin requires either 'publishableKey' or 'client' option",
      );
    }

    const contextValue: SchematicContextValue = {
      client,
    };

    app.provide(SchematicSymbol, contextValue);

    // Note: We don't clean up the client here since the plugin install
    // happens once at app creation. Users should call cleanup manually
    // when the app is being destroyed if needed, or use the composable
    // lifecycle hooks.
  },
};

/**
 * Access the Schematic client instance
 * Must be called within a component that has SchematicPlugin installed
 *
 * @throws Error if called outside of a component with SchematicPlugin
 */
export const useSchematic = () => {
  const context = inject(SchematicSymbol);
  if (!context) {
    throw new Error(
      "useSchematic must be used within a component where SchematicPlugin is installed",
    );
  }
  return context;
};

/**
 * Hook to ensure cleanup happens when scope is disposed
 * Only cleans up if the client was not provided externally
 */
export const useSchematicCleanup = (
  client: SchematicJS.Schematic,
  isProvidedClient: boolean = false,
) => {
  onScopeDispose(() => {
    // Only cleanup if we created the client ourselves
    if (!isProvidedClient) {
      client.cleanup().catch((error) => {
        console.error("Error during Schematic cleanup:", error);
      });
    }
  });
};
