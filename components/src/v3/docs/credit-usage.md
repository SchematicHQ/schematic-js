# CreditUsage

The company's credit balances: a burndown meter per credit, the grant ledger behind it, and a "Buy more" call to action when the catalog sells bundles for it.

## Hook and derivation

`useCreditBalances()` serves `GET /company/credits`; `deriveCreditBalances` turns the balances into `CreditBalanceSummary[]` (meter percent and state, formatted totals, the ledger newest first, and the bundles purchasable on the current plan). The catalog and company are optional: without them there are no bundles and `canBuyMore` is false.

```tsx
import {
  deriveCreditBalances,
  useCatalog,
  useCompany,
  useCreditBalances,
} from "@schematichq/schematic-components/v3";

function Credits() {
  const { data: balances } = useCreditBalances();
  const { data: catalog } = useCatalog();
  const { data: company } = useCompany();
  if (balances === undefined) return null;
  const summaries = deriveCreditBalances(balances, {
    locale: "en-US",
    catalog,
    currentPlanId: company?.plan?.id,
    currency: company?.subscription?.currency,
  });
  return (
    <ul>
      {summaries.map((s) => (
        <li key={s.credit.id}>
          {s.credit.name}: {s.remainingText} {s.unit} remaining
          {s.canBuyMore && ` (${s.bundles.length} bundles on offer)`}
        </li>
      ))}
    </ul>
  );
}
```

## The styled element

```tsx
<CreditUsage
  onBuyBundle={(summary, bundles) => openCheckout(summary.credit.id, bundles)}
/>
```

| Prop                                         | Default            | Effect                                                        |
| -------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| `visibleCredits`                             | all                | Credit IDs to show, in this order.                            |
| `showHeader` / `headerText`                  | `true` / "Credits" | The heading.                                                  |
| `showIcons`, `showDescription`               | `true`             | Credit icon and description.                                  |
| `showLedger`, `visibleGrantCount`            | `true`, `3`        | The collapsible grant ledger and rows shown before "See all". |
| `showExpiry`                                 | `true`             | "Expires …" beside the remaining count.                       |
| `showBundles`                                | `true`             | Lists the purchasable bundles under "Buy more".               |
| `warningPercent`                             | `90`               | Percent used at which the meter warns.                        |
| `onBuyBundle`, `buyMoreUrl`, `buyMoreTarget` | —                  | "Buy more" handoff: callback, link, or both.                  |
| `className`, `locale`                        | —                  | Root class; BCP 47 tag for formatting.                        |
