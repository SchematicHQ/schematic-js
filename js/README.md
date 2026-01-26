# schematic-js

`schematic-js` is a client-side JavaScript SDK for tracking event-based usage, identifying users, and checking flags using [Schematic](https://schematichq.com).

## Install

```bash
npm install @schematichq/schematic-js
# or
yarn add @schematichq/schematic-js
# or
pnpm add @schematichq/schematic-js
```

## Usage

You can use Schematic to identify users; after this, your subsequent track events and flag checks will be associated with this user.

A number of these examples use `keys` to identify companies and users. Learn more about keys [here](https://docs.schematichq.com/developer_resources/key_management).

```typescript
import { Schematic } from "@schematichq/schematic-js";

const schematic = new Schematic("your-api-key");

// Send an identify event
schematic.identify({
    keys: {
        id: "my-user-id",
    },
    traits: {
        anykey: "anyval",
    },
    company: {
        name: "My Company",
        keys: {
            id: "my-company-id",
        },
        traits: {
            location: "Atlanta, GA",
        },
    },
});

// Send a track event to record usage
schematic.track({ event: "query" });
// OR, Send a track event with a quantity to record multiple units of usage
schematic.track({ event: "query", quantity: 10 });

// Check a flag
await schematic.checkFlag({ key: "some-flag-key" });
```

By default, `checkFlag` will perform a network request to get the flag value for this user. If you'd like to check all flags at once in order to minimize network requests, you can use `checkFlags`:

```typescript
import { Schematic } from "@schematichq/schematic-js";

const schematic = new Schematic("your-api-key");

schematic.identify({
    keys: { id: "my-user-id" },
    company: {
        keys: { id: "my-company-id" },
    },
});

await schematic.checkFlags();
```

Alternatively, you can run in websocket mode, which will keep a persistent connection open to the Schematic service and receive flag updates in real time:

```typescript
import { Schematic } from "@schematichq/schematic-js";

const schematic = new Schematic("your-api-key", { useWebSocket: true });

schematic.identify({
    keys: { id: "my-user-id" },
    company: { keys: { id: "my-company-id" } },
});

await schematic.checkFlag("some-flag-key");

// Close the connection when you're done with the Schematic client
schematic.cleanup();
```

## Fallback Behavior

The SDK includes built-in fallback behavior you can use to ensure your application continues to function even when unable to reach Schematic (e.g., during service disruptions or network issues).

### Flag Check Fallbacks

When `checkFlag` cannot reach Schematic, it uses fallback values in the following priority order:

1. Callsite fallback - fallback values can be provided directly in the `checkFlag` call
2. Initialization defaults - fallback values configured via `flagCheckDefaults` or `flagValueDefaults` options when initializing the SDK
3. Default value - Returns `false` if no fallback is configured

```typescript
// Provide a fallback value at the callsite
const value = await schematic.checkFlag({ 
    key: "feature-flag", 
    fallback: true  // Used if API request fails
});

// Or configure defaults at initialization
const schematic = new Schematic("your-api-key", {
    flagValueDefaults: {
        "feature-flag": true,  // Used if API request fails and no callsite fallback
    },
    flagCheckDefaults: {
        "another-flag": {
            flag: "another-flag",
            value: true,
            reason: "Default value",
        },
    },
});
```

### Event Queueing and Retry

When events (track, identify) cannot be sent due to network issues, they are automatically queued and retried:

- Events are queued in memory (up to 100 events by default, configurable via `maxEventQueueSize`)
- Failed events are retried with exponential backoff (up to 5 attempts by default, configurable via `maxEventRetries`)
- Events are automatically flushed when the network connection is restored
- Events queued when the page is hidden are sent when the page becomes visible

### WebSocket Fallback

In WebSocket mode, if the WebSocket connection fails:

- The SDK automatically falls back to REST API calls for flag checks
- If REST API calls also fail, flag checks use the same fallback priority described above
- The SDK automatically attempts to reconnect the WebSocket with exponential backoff

### Network Resilience

The SDK includes several mechanisms to handle network disruptions:

- Automatic retry logic for both WebSocket connections and REST API calls
- Exponential backoff to avoid overwhelming the service during outages
- Event queueing to ensure events are not lost during network issues

## Troubleshooting

For debugging and development, Schematic supports two special modes:

### Debug Mode

Enables console logging of all Schematic operations:

```typescript
// Enable at initialization
const schematic = new Schematic("your-api-key", { debug: true });

// Or via URL parameter
// https://yoursite.com/?schematic_debug=true
```

### Offline Mode

Prevents network requests and returns fallback values for all flag checks:

```typescript
// Enable at initialization
const schematic = new Schematic("your-api-key", { offline: true });

// Or via URL parameter
// https://yoursite.com/?schematic_offline=true
```

Offline mode automatically enables debug mode to help with troubleshooting.

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com) and we'll be happy to assist.
