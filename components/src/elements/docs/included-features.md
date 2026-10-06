# IncludedFeatures

Every feature the company is entitled to: what it gets, what it has used, and, for a priced feature, what that costs.

## Hook and derivation

`useFeatureUsage()` serves `GET /company/usage`. It takes no parameters and `data` is a `FeatureUsage[]`; **an empty list is a loaded answer** — the company is entitled to nothing — so only `data === undefined` means not loaded. A 404 means the account is not on the `company-context-api` flag and surfaces as an error.

The server has already made the pricing decisions the embed used to make in the browser. Each row carries one `price`: the metered price the company is billed at, for its billing period and in its subscription's currency where the feature is priced in it. It also carries `currentCost`, what the feature costs at that price. A row says whether it is a plan entitlement or a company override (`entitlementType`); only an override has `expiresAt`. A license feature lists the plan's per-license credit grants.

`deriveIncludedFeatures` turns the rows into display parts. The wording stays with the caller: each line is a `kind` with its numbers, names and dates already formatted.

```tsx
import {
  deriveIncludedFeatures,
  useFeatureUsage,
} from "@schematichq/schematic-components/elements";

function Features() {
  const { data } = useFeatureUsage();
  if (data === undefined) return <Spinner />;

  return (
    <ul>
      {deriveIncludedFeatures(data, { locale: "en-US" }).map((row) => (
        <li key={row.featureId}>
          {row.name}
          {row.entitlement?.kind === "units" &&
            ` — ${row.entitlement.amount} ${row.entitlement.units}`}
        </li>
      ))}
    </ul>
  );
}
```

`usageLimit`, `currentTier`, `pricePeriod` and `tierRanges` are exported on their own for a host that reads the rows directly.

## The styled element

```tsx
<IncludedFeatures visibleFeatures={["feat_api", "feat_seats"]} showHardLimit />
```

| Prop                          | Default | Effect                                                         |
| ----------------------------- | ------- | -------------------------------------------------------------- |
| `showHeader`                  | `true`  | The "Included features" heading.                               |
| `showIcon`                    | `true`  | Each feature's icon, where it has one.                         |
| `showDescription`             | `true`  | Each feature's description.                                    |
| `showExpiration`              | `true`  | When a company override ends.                                  |
| `showEntitlement`             | `true`  | What the company gets: its allocation, price, or tier.         |
| `showUsage`                   | `true`  | What it has used, what that costs, and when it resets.         |
| `visibleFeatures`             | —       | Feature ids to show, in this order; every feature when absent. |
| `showCredits`                 | `true`  | The "credits per use" line on credit-burning features.         |
| `showHardLimit`               | `false` | An info tip with the hard limit on features billed past it.    |
| `showWarningThresholdAsLimit` | `false` | The warning threshold in place of the limit, where one is set. |
| `headingLevel`                | `2`     | The heading's level, to fit the host's outline.                |
| `className`, `locale`         | —       | Root class; BCP 47 tag for formatting.                         |
| `strings`                     | —       | Copy for this card by key; wins over the provider's.           |

The first four features show, with "See all" for the rest. A company entitled to nothing gets the heading over an empty list; a host that would rather show nothing leaves the element off the page.

## Localizing it

The card's own copy is under `includedFeatures*`; the usage lines share `usage*` and `period*Short` with MeteredFeatures, so a host renames them once for both.
