# schematic-react

`schematic-react` is a client-side React library for [Schematic](https://schematichq.com) which provides hooks to track events, check flags, and more. `schematic-react` provides the same capabilities as [schematic-js](https://github.com/schematichq/schematic-js/tree/main/js), for React apps.

## Install

```bash
npm install @schematichq/schematic-react
# or
yarn add @schematichq/schematic-react
# or
pnpm add @schematichq/schematic-react
```

## Usage

### SchematicProvider

You can use the `SchematicProvider` to wrap your application and provide the Schematic instance to all components:

```tsx
import { SchematicProvider } from "@schematichq/schematic-react";

ReactDOM.render(
    <SchematicProvider publishableKey="your-publishable-key">
        <App />
    </SchematicProvider>,
    document.getElementById("root"),
);
```

### Setting context

To set the user context for events and flag checks, you can use the `identify` function provided by the `useSchematicEvents` hook:

```tsx
import { useSchematicEvents } from "@schematichq/schematic-react";

const MyComponent = () => {
    const { identify } = useSchematicEvents();

    useEffect(() => {
        identify({
            keys: { id: "my-user-id" },
            company: {
                keys: { id: "my-company-id" },
                traits: { location: "Atlanta, GA" },
            },
        });
    }, []);

    return <div>My Component</div>;
};
```

To learn more about identifying companies with the `keys` map, see [key management in Schematic public docs](https://docs.schematichq.com/developer_resources/key_management).

### Tracking usage

Once you've set the context with `identify`, you can track events:

```tsx
import { useSchematicEvents } from "@schematichq/schematic-react";

const MyComponent = () => {
    const { track } = useSchematicEvents();

    useEffect(() => {
        track({ event: "query" });
    }, []);

    return <div>My Component</div>;
};
```

If you want to record large numbers of the same event at once, or perhaps measure usage in terms of a unit like tokens or memory, you can optionally specify a quantity for your event:

```tsx
track({ event: "query", quantity: 10 });
```

### Checking flags

To check a flag, you can use the `useSchematicFlag` hook:

```tsx
import { useSchematicFlag } from "@schematichq/schematic-react";
import { Feature, Fallback } from "./components";

const MyComponent = () => {
    const isFeatureEnabled = useSchematicFlag("my-flag-key");

    return isFeatureEnabled ? <Feature /> : <Fallback />;
};
```

### Checking entitlements

You can check entitlements (i.e., company access to a feature) using a flag check as well, and using the `useSchematicEntitlement` hook you can get additional data to render various feature states:

```tsx
import {
    useSchematicEntitlement,
    useSchematicIsPending,
} from "@schematichq/schematic-react";
import { Feature, Loader, NoAccess } from "./components";

const MyComponent = () => {
    const schematicIsPending = useSchematicIsPending();
    const {
        featureAllocation,
        featureUsage,
        featureUsageExceeded,
        value: isFeatureEnabled,
    } = useSchematicEntitlement("my-flag-key");

    // loading state
    if (schematicIsPending) {
        return <Loader />;
    }

    // usage exceeded state
    if (featureUsageExceeded) {
        return (
            <div>
                You have used all of your usage ({featureUsage} /{" "}
                {featureAllocation})
            </div>
        );
    }

    // either feature state or "no access" state
    return isFeatureEnabled ? <Feature /> : <NoAccess />;
};
```

*Note: `useSchematicIsPending` is checking if entitlement data has been loaded, typically via `identify`. It should, therefore, be used to wrap flag and entitlement checks, but never the initial call to `identify`.*

## Fallback Behavior

The SDK includes built-in fallback behavior you can use to ensure your application continues to function even when unable to reach Schematic (e.g., during service disruptions or network issues).

### Flag Check Fallbacks

When flag checks cannot reach Schematic, they use fallback values in the following priority order:

1. Callsite fallback - fallback values can be provided directly in the hook options
2. Initialization defaults - fallback values configured via `flagCheckDefaults` or `flagValueDefaults` options when initializing the provider
3. Default value - Returns `false` if no fallback is configured

```tsx
// Provide a fallback value at the callsite
import { useSchematicFlag } from "@schematichq/schematic-react";

const MyComponent = () => {
    const isFeatureEnabled = useSchematicFlag("feature-flag", {
        fallback: true,  // Used if API request fails
    });

    return isFeatureEnabled ? <Feature /> : <Fallback />;
};

// Or configure defaults at initialization
import { SchematicProvider } from "@schematichq/schematic-react";

ReactDOM.render(
    <SchematicProvider
        publishableKey="your-publishable-key"
        flagValueDefaults={{
            "feature-flag": true,  // Used if API request fails and no callsite fallback
        }}
        flagCheckDefaults={{
            "another-flag": {
                flag: "another-flag",
                value: true,
                reason: "Default value",
            },
        }}
    >
        <App />
    </SchematicProvider>,
    document.getElementById("root"),
);
```

### Event Queueing and Retry

When events (track, identify) cannot be sent due to network issues, they are automatically queued and retried:

- Events are queued in memory (up to 100 events by default, configurable via `maxEventQueueSize`)
- Failed events are retried with exponential backoff (up to 5 attempts by default, configurable via `maxEventRetries`)
- Events are automatically flushed when the network connection is restored
- Events queued when the page is hidden are sent when the page becomes visible

### WebSocket Fallback

In WebSocket mode, if the WebSocket connection fails, the SDK will provide the last known value or the configured fallback values as [outlined above](/#flag-check-fallbacks). The WebSocket will also automatically attempt to re-establish it's connection with Schematic using an exponential backoff. 

## React Native

### Handling app background/foreground

When a React Native app is backgrounded for an extended period, the WebSocket connection may be closed by the OS. When the app returns to the foreground, the connection will automatically reconnect, but this happens on an exponential backoff timer which may cause a delay before fresh flag values are available.

For cases where you need immediate flag updates when returning to the foreground (e.g., after an in-app purchase), you can use one of these methods to re-establish the connection:

- `forceReconnect()`: Always closes and re-establishes the WebSocket connection, guaranteeing fresh values
- `reconnectIfNeeded()`: Only reconnects if the current connection is unhealthy (more efficient for frequent foreground events)

```tsx
import { useSchematic } from "@schematichq/schematic-react";
import { useEffect } from "react";
import { AppState } from "react-native";

const SchematicAppStateHandler = () => {
    const { client } = useSchematic();

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                // Use forceReconnect() for guaranteed fresh values
                client.forceReconnect();
                // Or use reconnectIfNeeded() to skip if connection is healthy
                // client.reconnectIfNeeded();
            }
        });
        return () => subscription.remove();
    }, [client]);

    return null;
};
```

Render this inside your `SchematicProvider`.

## Troubleshooting

For debugging and development, Schematic supports two special modes:

### Debug Mode

Enables console logging of all Schematic operations:

```typescript
// Enable at initialization
import { SchematicProvider } from "@schematichq/schematic-react";

ReactDOM.render(
    <SchematicProvider publishableKey="your-publishable-key" debug={true}>
        <App />
    </SchematicProvider>,
    document.getElementById("root"),
);

// Or via URL parameter
// https://yoursite.com/?schematic_debug=true
```

### Offline Mode

Prevents network requests and returns fallback values for all flag checks:

```typescript
// Enable at initialization
import { SchematicProvider } from "@schematichq/schematic-react";

ReactDOM.render(
    <SchematicProvider publishableKey="your-publishable-key" offline={true}>
        <App />
    </SchematicProvider>,
    document.getElementById("root"),
);

// Or via URL parameter
// https://yoursite.com/?schematic_offline=true
```

Offline mode automatically enables debug mode to help with troubleshooting.

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com) and we'll be happy to assist.
