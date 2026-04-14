import {
  DestroyRef,
  inject,
  InjectionToken,
  makeEnvironmentProviders,
} from "@angular/core";
import * as SchematicJS from "@schematichq/schematic-js";

import { version } from "./version";

export const SCHEMATIC_CLIENT = new InjectionToken<SchematicJS.Schematic>(
  "SchematicClient",
);

type BaseSchematicConfig = Omit<SchematicJS.SchematicOptions, "useWebSocket">;

type SchematicConfigWithClient = BaseSchematicConfig & {
  client: SchematicJS.Schematic;
  publishableKey?: never;
};

type SchematicConfigWithKey = BaseSchematicConfig & {
  client?: never;
  publishableKey: string;
};

export type SchematicConfig =
  | SchematicConfigWithClient
  | SchematicConfigWithKey;

export function provideSchematic(config: SchematicConfig) {
  return makeEnvironmentProviders([
    {
      provide: SCHEMATIC_CLIENT,
      useFactory: () => {
        const isProvidedClient = "client" in config && !!config.client;

        const client = isProvidedClient
          ? config.client
          : new SchematicJS.Schematic(config.publishableKey!, {
              useWebSocket: true,
              additionalHeaders: {
                "X-Schematic-Client-Version": `schematic-angular@${version}`,
                ...config.additionalHeaders,
              },
              ...config,
            });

        const destroyRef = inject(DestroyRef);
        destroyRef.onDestroy(() => {
          if (!isProvidedClient) {
            client.cleanup().catch((error: unknown) => {
              console.error("Error during Schematic cleanup:", error);
            });
          }
        });

        return client;
      },
    },
  ]);
}
