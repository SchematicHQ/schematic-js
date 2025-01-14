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

To check a flag, you can use the `useSchematicFlag` hook:

```tsx
import { useSchematicFlag } from "@schematichq/schematic-react";
import { Feature, Fallback } from "./components";

const MyComponent = () => {
    const isFeatureEnabled = useSchematicFlag("my-flag-key");

    return isFeatureEnabled ? <Feature /> : <Fallback />;
};
```

For flags that are checking company access to a feature based on usage, you can render additional states using the `useSchematicFlagCheck` hook, e.g.:

```tsx
import {
    useSchematicFlagCheck,
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
    } = useSchematicFlagCheck("my-flag-key");

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

    // either feature or "no access" state
    return isFeatureEnabled ? <Feature /> : <NoAccess />;
};
```

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com) and we'll be happy to assist.
