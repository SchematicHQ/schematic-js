# schematic-angular

`schematic-angular` is a client-side Angular library for [Schematic](https://schematichq.com) which provides an injectable service to track events, check flags, and more. `schematic-angular` provides the same capabilities as [schematic-js](https://github.com/schematichq/schematic-js/tree/main/js), for Angular apps.

## Install

```bash
npm install @schematichq/schematic-angular
# or
yarn add @schematichq/schematic-angular
# or
pnpm add @schematichq/schematic-angular
```

## Usage

### Setup with `provideSchematic`

Add `provideSchematic` to your application's providers. This works with both standalone and NgModule-based apps.

**Standalone app (app.config.ts):**

```typescript
import { ApplicationConfig } from "@angular/core";
import { provideSchematic } from "@schematichq/schematic-angular";

export const appConfig: ApplicationConfig = {
  providers: [
    provideSchematic({ publishableKey: "your-publishable-key" }),
  ],
};
```

**NgModule-based app:**

```typescript
import { NgModule } from "@angular/core";
import { provideSchematic } from "@schematichq/schematic-angular";

@NgModule({
  providers: [
    provideSchematic({ publishableKey: "your-publishable-key" }),
  ],
})
export class AppModule {}
```

You can also pass a pre-configured client:

```typescript
import { Schematic } from "@schematichq/schematic-angular";

const client = new Schematic("your-publishable-key", { useWebSocket: true });

provideSchematic({ client });
```

### Setting context

To set the user context for events and flag checks, use the `identify` method on `SchematicService`:

```typescript
import { Component, OnInit, inject } from "@angular/core";
import { SchematicService } from "@schematichq/schematic-angular";

@Component({ selector: "app-root", template: `<router-outlet />` })
export class AppComponent implements OnInit {
  private schematic = inject(SchematicService);

  ngOnInit() {
    this.schematic.identify({
      keys: { id: "my-user-id" },
      company: {
        keys: { id: "my-company-id" },
        traits: { location: "Atlanta, GA" },
      },
    });
  }
}
```

To learn more about identifying companies with the `keys` map, see [key management in Schematic public docs](https://docs.schematichq.com/developer_resources/key_management).

### Tracking usage

Once you've set the context with `identify`, you can track events:

```typescript
import { Component, inject } from "@angular/core";
import { SchematicService } from "@schematichq/schematic-angular";

@Component({
  selector: "app-usage",
  template: `<button (click)="onQuery()">Run Query</button>`,
})
export class UsageComponent {
  private schematic = inject(SchematicService);

  onQuery() {
    this.schematic.track({ event: "query" });
  }
}
```

If you want to record large numbers of the same event at once, or measure usage in terms of a unit like tokens or memory, you can optionally specify a quantity:

```typescript
this.schematic.track({ event: "query", quantity: 10 });
```

### Checking flags

Use `flagValue$` to get an Observable of a flag's boolean value:

**With async pipe:**

```typescript
import { Component, inject } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { SchematicService } from "@schematichq/schematic-angular";

@Component({
  selector: "app-feature",
  standalone: true,
  imports: [AsyncPipe],
  template: `
    @if (isFeatureEnabled$ | async) {
      <app-feature />
    } @else {
      <app-fallback />
    }
  `,
})
export class FeatureComponent {
  private schematic = inject(SchematicService);
  isFeatureEnabled$ = this.schematic.flagValue$("my-flag-key");
}
```

**With Signals (Angular 16+):**

```typescript
import { Component, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { SchematicService } from "@schematichq/schematic-angular";

@Component({
  selector: "app-feature",
  standalone: true,
  template: `
    @if (isFeatureEnabled()) {
      <app-feature />
    } @else {
      <app-fallback />
    }
  `,
})
export class FeatureComponent {
  private schematic = inject(SchematicService);
  isFeatureEnabled = toSignal(this.schematic.flagValue$("my-flag-key"), {
    initialValue: false,
  });
}
```

### Checking entitlements

Use `flagCheck$` to get an Observable with detailed entitlement data including usage information:

```typescript
import { Component, inject } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { SchematicService } from "@schematichq/schematic-angular";

@Component({
  selector: "app-entitlement",
  standalone: true,
  imports: [AsyncPipe],
  template: `
    @if (isPending$ | async) {
      <app-loader />
    } @else if (entitlement$ | async; as entitlement) {
      @if (entitlement.featureUsageExceeded) {
        <div>
          You have used all of your usage
          ({{ entitlement.featureUsage }} / {{ entitlement.featureAllocation }})
        </div>
      } @else if (entitlement.value) {
        <app-feature />
      } @else {
        <app-no-access />
      }
    }
  `,
})
export class EntitlementComponent {
  private schematic = inject(SchematicService);
  isPending$ = this.schematic.isPending$();
  entitlement$ = this.schematic.flagCheck$("my-flag-key");
}
```

*Note: `isPending$` checks if entitlement data has been loaded, typically via `identify`. It should be used to wrap flag and entitlement checks, but never the initial call to `identify`.*

### Checking plans

Use `plan$` to get an Observable of the current plan information:

```typescript
import { Component, inject } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { SchematicService } from "@schematichq/schematic-angular";

@Component({
  selector: "app-plan",
  standalone: true,
  imports: [AsyncPipe],
  template: `
    @if (plan$ | async; as plan) {
      <div>Current plan: {{ plan.name }}</div>
    } @else {
      <div>No active subscription</div>
    }
  `,
})
export class PlanComponent {
  private schematic = inject(SchematicService);
  plan$ = this.schematic.plan$();
}
```

## API Reference

### `provideSchematic(config)`

Configures the Schematic client for dependency injection. Accepts either a `publishableKey` string or a pre-configured `client` instance, plus any `SchematicOptions`.

### `SchematicService`

Injectable service providing all Schematic functionality:

| Method | Return Type | Description |
|---|---|---|
| `getClient()` | `Schematic` | Access the underlying Schematic client |
| `setContext(ctx)` | `void` | Set the evaluation context (company/user) |
| `identify(body)` | `void` | Identify a user and/or company |
| `track(body)` | `void` | Track a usage event |
| `flagValue$(key, fallback?)` | `Observable<boolean>` | Observe a feature flag's boolean value |
| `flagCheck$(key, fallback?)` | `Observable<CheckFlagReturn>` | Observe detailed entitlement data |
| `plan$()` | `Observable<CheckPlanReturn \| undefined>` | Observe plan information |
| `isPending$()` | `Observable<boolean>` | Observe loading state |

### `SCHEMATIC_CLIENT`

`InjectionToken<Schematic>` for direct access to the raw client instance via Angular DI.

## Fallback Behavior

The SDK includes built-in fallback behavior to ensure your application continues to function even when unable to reach Schematic.

### Flag Check Fallbacks

When flag checks cannot reach Schematic, they use fallback values in the following priority order:

1. **Callsite fallback**: provided as the second argument to `flagValue$` or `flagCheck$`
2. **Initialization defaults**: configured via `flagCheckDefaults` or `flagValueDefaults` options in `provideSchematic`
3. **Default value**: returns `false` if no fallback is configured

```typescript
// Provide a fallback value at the callsite
isFeatureEnabled$ = this.schematic.flagValue$("feature-flag", true);

// Or configure defaults at initialization
provideSchematic({
  publishableKey: "your-publishable-key",
  flagValueDefaults: {
    "feature-flag": true,
  },
});
```

### Event Queueing and Retry

When events (track, identify) cannot be sent due to network issues, they are automatically queued and retried:

- Events are queued in memory (up to 100 events by default, configurable via `maxEventQueueSize`)
- Failed events are retried with exponential backoff (up to 5 attempts by default, configurable via `maxEventRetries`)
- Events are automatically flushed when the network connection is restored

### WebSocket Fallback

In WebSocket mode, if the WebSocket connection fails, the SDK will provide the last known value or the configured fallback values as outlined above. The WebSocket will also automatically attempt to re-establish its connection using an exponential backoff.

## Troubleshooting

For debugging and development, Schematic supports two special modes:

### Debug Mode

Enables console logging of all Schematic operations:

```typescript
provideSchematic({
  publishableKey: "your-publishable-key",
  debug: true,
});

// Or via URL parameter
// https://yoursite.com/?schematic_debug=true
```

### Offline Mode

Prevents network requests and returns fallback values for all flag checks:

```typescript
provideSchematic({
  publishableKey: "your-publishable-key",
  offline: true,
});

// Or via URL parameter
// https://yoursite.com/?schematic_offline=true
```

Offline mode automatically enables debug mode to help with troubleshooting.

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com) and we'll be happy to assist.
