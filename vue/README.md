# schematic-vue

`schematic-vue` is a client-side Vue library for [Schematic](https://schematichq.com) which provides composables to track events, check flags, and more. `schematic-vue` provides the same capabilities as [schematic-js](https://github.com/schematichq/schematic-js/tree/main/js), for Vue apps.

## Install

```bash
npm install @schematichq/schematic-vue
# or
yarn add @schematichq/schematic-vue
# or
pnpm add @schematichq/schematic-vue
```

## Usage

### SchematicPlugin

You can use the `SchematicPlugin` to make Schematic available throughout your Vue application:

```typescript
import { createApp } from "vue";
import { SchematicPlugin } from "@schematichq/schematic-vue";
import App from "./App.vue";

const app = createApp(App);
app.use(SchematicPlugin, { publishableKey: "your-publishable-key" });
app.mount("#app");
```

### Setting context

To set the user context for events and flag checks, you can use the `identify` function provided by the `useSchematicEvents` composable:

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { useSchematicEvents } from "@schematichq/schematic-vue";

const { identify } = useSchematicEvents();

onMounted(() => {
  identify({
    keys: { id: "my-user-id" },
    company: {
      keys: { id: "my-company-id" },
      traits: { location: "Atlanta, GA" },
    },
  });
});
</script>
```

To learn more about identifying companies with the `keys` map, see [key management in Schematic public docs](https://docs.schematichq.com/developer_resources/key_management).

### Tracking usage

Once you've set the context with `identify`, you can track events:

```vue
<script setup lang="ts">
import { useSchematicEvents } from "@schematichq/schematic-vue";

const { track } = useSchematicEvents();

function handleQuery() {
  track({ event: "query" });
}
</script>

<template>
  <button @click="handleQuery">Run Query</button>
</template>
```

If you want to record large numbers of the same event at once, or perhaps measure usage in terms of a unit like tokens or memory, you can optionally specify a quantity for your event:

```typescript
track({ event: "query", quantity: 10 });
```

### Checking flags

To check a flag, you can use the `useSchematicFlag` composable:

```vue
<script setup lang="ts">
import { useSchematicFlag } from "@schematichq/schematic-vue";

const isFeatureEnabled = useSchematicFlag("my-flag-key");
</script>

<template>
  <div v-if="isFeatureEnabled">
    <Feature />
  </div>
  <div v-else>
    <Fallback />
  </div>
</template>
```

### Checking entitlements

You can check entitlements (i.e., company access to a feature) using a flag check as well, and using the `useSchematicEntitlement` composable you can get additional data to render various feature states:

```vue
<script setup lang="ts">
import {
  useSchematicEntitlement,
  useSchematicIsPending,
} from "@schematichq/schematic-vue";

const schematicIsPending = useSchematicIsPending();
const {
  featureAllocation,
  featureUsage,
  featureUsageExceeded,
  value: isFeatureEnabled,
} = useSchematicEntitlement("my-flag-key");
</script>

<template>
  <!-- Loading state -->
  <Loader v-if="schematicIsPending" />

  <!-- Usage exceeded state -->
  <div v-else-if="featureUsageExceeded">
    You have used all of your usage ({{ featureUsage }} / {{ featureAllocation }})
  </div>

  <!-- Either feature state or "no access" state -->
  <Feature v-else-if="isFeatureEnabled" />
  <NoAccess v-else />
</template>
```

_Note: `useSchematicIsPending` is checking if entitlement data has been loaded, typically via `identify`. It should, therefore, be used to wrap flag and entitlement checks, but never the initial call to `identify`._

## Options API Support

While the primary API uses the Composition API, you can still use these composables in the Options API:

```vue
<script>
import { useSchematicFlag, useSchematicEvents } from "@schematichq/schematic-vue";

export default {
  setup() {
    const isFeatureEnabled = useSchematicFlag("my-flag-key");
    const { track } = useSchematicEvents();

    return {
      isFeatureEnabled,
      track,
    };
  },
  methods: {
    handleAction() {
      this.track({ event: "action" });
    },
  },
};
</script>
```

## Troubleshooting

For debugging and development, Schematic supports two special modes:

### Debug Mode

Enables console logging of all Schematic operations:

```typescript
// Enable at initialization
import { createApp } from "vue";
import { SchematicPlugin } from "@schematichq/schematic-vue";

const app = createApp(App);
app.use(SchematicPlugin, {
  publishableKey: "your-publishable-key",
  debug: true,
});

// Or via URL parameter
// https://yoursite.com/?schematic_debug=true
```

### Offline Mode

Prevents network requests and returns fallback values for all flag checks:

```typescript
// Enable at initialization
import { createApp } from "vue";
import { SchematicPlugin } from "@schematichq/schematic-vue";

const app = createApp(App);
app.use(SchematicPlugin, {
  publishableKey: "your-publishable-key",
  offline: true,
});

// Or via URL parameter
// https://yoursite.com/?schematic_offline=true
```

Offline mode automatically enables debug mode to help with troubleshooting.

## Advanced Usage

### Using a Pre-configured Client

If you need more control over the Schematic client initialization, you can create a client instance and pass it to the plugin:

```typescript
import { createApp } from "vue";
import { Schematic } from "@schematichq/schematic-js";
import { SchematicPlugin } from "@schematichq/schematic-vue";
import App from "./App.vue";

const client = new Schematic("your-publishable-key", {
  useWebSocket: true,
  debug: true,
});

const app = createApp(App);
app.use(SchematicPlugin, { client });
app.mount("#app");
```

### Per-Component Client Override

You can override the client for a specific component by passing a `client` option to any composable:

```typescript
import { useSchematicFlag } from "@schematichq/schematic-vue";
import { Schematic } from "@schematichq/schematic-js";

const customClient = new Schematic("different-api-key");
const isFeatureEnabled = useSchematicFlag("my-flag-key", {
  client: customClient,
});
```

## Server-Side Rendering (SSR)

All composables are SSR-compatible and work seamlessly with Nuxt and other Vue SSR frameworks:

- Initial flag/entitlement values are retrieved synchronously for server-side rendering
- Real-time subscriptions are deferred to client-side hydration
- No special configuration needed - it just works!

```typescript
// plugins/schematic.ts
import { SchematicPlugin } from '@schematichq/schematic-vue'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  nuxtApp.vueApp.use(SchematicPlugin, { publishableKey: config.public.schematicPublishableKey })
})
```

```vue
<!-- Works in Nuxt/SSR -->
<script setup lang="ts">
import { useSchematicFlag } from "@schematichq/schematic-vue";

// Initial value available on server, updates subscribed on client
const isFeatureEnabled = useSchematicFlag("my-feature");
</script>
```

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com) and we'll be happy to assist.
