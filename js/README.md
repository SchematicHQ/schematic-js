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

// Check a flag
await schematic.checkFlag("some-flag-key");
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

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com) and we'll be happy to assist.
