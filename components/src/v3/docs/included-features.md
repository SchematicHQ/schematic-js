# IncludedFeatures

Every feature the company holds, as rows: icon, name, description, and —
for event and trait features — the allocation ("10,000 API calls") with the
usage line under it ("8,200 of 10,000 used • Resets 9/1"). Needs an access
token.

## Headless: hook → derivation → your JSX

```tsx
import {
  derivePeriod,
  deriveUsage,
  useCompany,
  useFeatureUsage,
} from "@schematichq/schematic-components/v3";

function Features() {
  const { data: rows, isPending, error } = useFeatureUsage();
  const { data: company } = useCompany();
  if (rows === undefined)
    return isPending ? <Spinner /> : <p>{error?.message}</p>;

  const sub = company?.subscription ?? null;
  const options = {
    locale: "en-US",
    period: sub === null ? null : derivePeriod(sub.interval, sub.intervalCount),
    currency: sub?.currency ?? null,
  };

  return (
    <ul>
      {rows.map((row) => {
        const s = deriveUsage(row, options);
        return (
          <li key={row.feature.id}>
            {s.feature.name}
            {s.isMetered &&
              ` — ${s.usage.usedText}${s.usage.limitText === null ? "" : ` of ${s.usage.limitText}`} ${s.usage.unit}`}
            {s.expiresAt !== null && ` (expires ${s.expiresAt.text})`}
          </li>
        );
      })}
    </ul>
  );
}
```

`deriveUsage` resolves the allocation branch (`allocation.kind`: `limit`,
`priced_unit`, `tier`, `credit_rate`, `credit_limit`, `unlimited`, `none`),
the usage state (`ok` / `warning` / `over`), cost, reset and expiry dates,
and the hard limit when asked for.

## Styled element

```tsx
import { IncludedFeatures, SchematicStyles } from "@schematichq/schematic-components/v3";

<SchematicStyles />
<IncludedFeatures
  headerText="Your plan includes"
  visibleFeatures={["feat_api_calls", "feat_seats"]}
  showHardLimit
/>
```

Props (all optional): `visibleFeatures` (feature IDs; filters and orders),
`showHeader`, `headerText`, `showIcons`, `showDescription`, `showUsage`,
`showExpiration`, `showCredits`, `showHardLimit`,
`showWarningThresholdAsLimit`, `warningPercent`, `visibleCount`, `locale`,
`className`.

Per-license credit lines ("100 AI credits per seat per month") come from the
current plan's included credit grants and render only when the catalog
resource is available.
