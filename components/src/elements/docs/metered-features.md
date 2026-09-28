# MeteredFeatures

The company's usage of each event- or trait-based feature, a card each: what it has used against its limit, what that costs, and who on the team used it.

## Hooks and derivation

`useFeatureUsage()` serves `GET /company/usage`, the same resource IncludedFeatures reads, so a page showing both makes one request. `deriveMeteredFeatures` keeps the event and trait features and turns each into display parts:

- `headline`: what is used, or the quantity paid for in advance.
- `limit`: the line under it, such as "1,000 included", "Limit of 1,000", or "2 credits per use".
- `resetsAt`: when the usage metric resets.
- `meter`: the value, total, percent and `tone`. The tone is `ok`, `warning`, `critical`, `tier`, or `overage` once usage passes an overage's soft limit.
- `priceDetails`: the shelf under an overage or tiered feature.

A pay-as-you-go or credit-burning feature has no meter.

`useFeatureUserUsage(featureId)` serves `GET /company/usage/:feature_id/users`: the heaviest 20 users of an event-based feature this period, how many there are in all, the period's total, and usage sent without a user. It is keyed by feature and fetched when first read; a prefetch does not carry it. Any feature that is not an event-based entitlement of the company answers 404.

```tsx
import {
  deriveMeteredFeatures,
  useFeatureUsage,
  useFeatureUserUsage,
} from "@schematichq/schematic-components/elements";

function Usage() {
  const { data } = useFeatureUsage();
  if (data === undefined) return <Spinner />;

  return deriveMeteredFeatures(data, { locale: "en-US" }).map((row) => (
    <section key={row.featureId}>
      <h3>{row.name}</h3>
      {row.meter !== null && (
        <progress max={row.meter.total} value={row.meter.value} />
      )}
      {row.hasUsageByUser && <TopUsers featureId={row.featureId} />}
    </section>
  ));
}

function TopUsers({ featureId }: { featureId: string }) {
  const { data } = useFeatureUserUsage(featureId);
  return (
    <ol>
      {data?.users.map((user) => (
        <li key={user.userId}>
          {user.name ?? user.userId}: {user.usage}
        </li>
      ))}
    </ol>
  );
}
```

## The styled element

```tsx
<MeteredFeatures onAddMore={(feature) => openCheckout(feature.featureId)} />
```

| Prop                          | Default | Effect                                                                 |
| ----------------------------- | ------- | ---------------------------------------------------------------------- |
| `showIcon`                    | `true`  | Each feature's icon; the circle is held even without one.              |
| `showDescription`             | `true`  | Each feature's description.                                            |
| `showUsage`                   | `true`  | The headline: what is used, or the quantity paid for.                  |
| `showAllocation`              | `true`  | The limit line and when usage resets.                                  |
| `showMeter`                   | `true`  | The usage meter.                                                       |
| `showUsageByUser`             | `true`  | The breakdown by user, for event-based features.                       |
| `visibleFeatures`             | —       | Feature ids to show, in this order; every metered feature when absent. |
| `showCredits`                 | `true`  | The "credits per use" line on credit-burning features.                 |
| `showHardLimit`               | `false` | An info tip with the hard limit on features billed past it.            |
| `showWarningThresholdAsLimit` | `false` | The warning threshold in place of the limit, where one is set.         |
| `onAddMore`                   | —       | "Add More" on a feature paid in advance calls this with the row.       |
| `addMoreUrl`, `addMoreTarget` | —       | "Add More" links here when there is no `onAddMore`.                    |
| `headingLevel`                | `2`     | The level of each feature's name.                                      |
| `className`, `locale`         | —       | Root class; BCP 47 tag for formatting.                                 |
| `strings`                     | —       | Copy for this element by key; wins over the provider's.                |

Without `onAddMore` or `addMoreUrl` there is no "Add More": the elements do not open a checkout of their own. A company with no metered feature renders nothing.

## Localizing it

The element's own copy is under `meteredFeatures*`, the per-user list's under `usageByUser*`; the usage lines share `usage*` and `period*Short` with IncludedFeatures.
