import {
  DestroyRef,
  inject,
  makeEnvironmentProviders,
} from "@angular/core";
import * as SchematicJS from "@schematichq/schematic-js";

import { SchematicService } from "./schematic.service";
import { SCHEMATIC_CLIENT } from "./token";
import { version } from "./version";

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
  const {
    client: providedClient,
    publishableKey,
    additionalHeaders,
    ...restOpts
  } = config;

  return makeEnvironmentProviders([
    {
      provide: SCHEMATIC_CLIENT,
      useFactory: () => {
        const isProvidedClient = !!providedClient;

        const client = isProvidedClient
          ? providedClient
          : new SchematicJS.Schematic(publishableKey!, {
              ...restOpts,
              useWebSocket: true,
              additionalHeaders: {
                "X-Schematic-Client-Version": `schematic-angular@${version}`,
                ...additionalHeaders,
              },
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
    SchematicService,
  ]);
}
