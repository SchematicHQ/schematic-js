# MeteredFeatures

One card per event or trait feature the company holds: the usage so far, the
allocation, a meter where one makes sense, and overage or tier pricing. Pay-
in-advance features get an "Add more" call to action when the catalog allows
checkout. Needs an access token. Credits have their own element
(CreditUsage).

## Headless: hook → derivation → your JSX

```tsx
import {
  derivePeriod,
  deriveUsage,
  useCompany,
  useFeatureUsage,
} from "@schematichq/schematic-components/v3";

function Usage() {
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

  return rows
    .map((row) => deriveUsage(row, options))
    .filter((s) => s.isMetered)
    .map((s) => (
      <article key={s.feature.id} data-state={s.usage.state}>
        <h3>{s.feature.name}</h3>
        <p>
          {s.usage.usedText} {s.usage.unit} used
        </p>
        {s.showMeter && <progress max={100} value={s.usage.percent ?? 0} />}
        {s.overageUnits !== null && s.cost !== null && (
          <p>
            {s.overageUnits.quantityText} over · {s.cost.text}
          </p>
        )}
      </article>
    ));
}
```

`deriveUsage` gives you `usage.percent` and `usage.state` for a meter,
`unitPrice` (the pay-in-advance price or the overage rate), `overageUnits`,
`cost`, `tiers`, `resetsAt`, and `canAddMore`.

## Styled element

```tsx
import { MeteredFeatures, SchematicStyles } from "@schematichq/schematic-components/v3";

<SchematicStyles />
<MeteredFeatures
  warningPercent={75}
  addMoreUrl="/billing/seats"
  onAddMore={(row, summary) => track("add_more", row.feature.id)}
/>
```

Props (all optional): `visibleFeatures` (feature IDs; filters and orders),
`showHeader`, `headerText`, `showIcons`, `showDescription`, `showAllocation`,
`showUsage`, `showMeter`, `showHardLimit`, `showWarningThresholdAsLimit`,
`showCredits`, `warningPercent`, `onAddMore`, `addMoreUrl`, `addMoreTarget`,
`locale`, `className`.
