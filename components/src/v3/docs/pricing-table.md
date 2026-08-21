# PricingTable

The catalog's plans and add-ons at a selected period and currency. Works
with a publishable key alone (the public catalog) or with an access token
(decorated for the company: current plan, blocked plans, trials).

## Headless: hook → derivation → your JSX

```tsx
import {
  derivePlanOfferings,
  useCatalog,
} from "@schematichq/schematic-components/v3";

function Plans() {
  const { data: catalog, isPending, error } = useCatalog();
  const [period, setPeriod] = useState<"month" | "year">("month");
  if (catalog === undefined)
    return isPending ? <Spinner /> : <p>{error?.message}</p>;

  const offerings = derivePlanOfferings(catalog, {
    locale: "en-US",
    period,
    showZeroPriceAsFree: true,
  });

  return (
    <>
      {offerings.periods.map((p) => (
        <button key={p} onClick={() => setPeriod(p)}>
          {p}
        </button>
      ))}
      {offerings.plans.map((plan) => (
        <article key={plan.id}>
          <h3>{plan.name}</h3>
          {plan.price.kind === "priced" && (
            <p>
              {plan.price.text}/{plan.price.periodWord}
            </p>
          )}
          {plan.price.kind === "free" && <p>Free</p>}
          <ul>
            {plan.entitlements.map((e) => (
              <li key={e.feature.id}>
                {e.value.kind === "numeric"
                  ? `${e.value.quantityText} ${e.value.unit}`
                  : e.feature.name}
              </li>
            ))}
          </ul>
          <button disabled={plan.action.disabled}>
            {plan.action.kind === "current" ? "Current plan" : "Choose"}
          </button>
        </article>
      ))}
    </>
  );
}
```

`derivePlanOfferings` re-snaps the selection to what is offered, prices every
card, decides each CTA (`action.kind`, `disabled`, `reason`, `direction`,
`trial`, `downgradeBlocked`), and exposes `savings` for a period toggle.

## Styled element

```tsx
import { PricingTable, SchematicStyles } from "@schematichq/schematic-components/v3";

<SchematicStyles />
<PricingTable
  showZeroPriceAsFree
  showAsMonthlyPrices
  callToActionUrl="/signup"
  onSelectPlan={(plan, { period, currency, priceId }) => track("select_plan", plan.id)}
/>
```

Props (all optional): `defaultPeriod`, `defaultCurrency`, `currencyFilter`,
`showHeader`, `showPeriodToggle`, `showCurrencySelector`, `showSavings`,
`showAsMonthlyPrices`, `showZeroPriceAsFree`, `showCredits`,
`showDescription`, `showFeatureDescription`, `showHardLimit`,
`showInclusionText`, `showFeatureIcons`, `showEntitlements`, `showAddOns`,
`visibleEntitlementCount`, `callToActionUrl`, `callToActionTarget`,
`onSelectPlan`, `onSelectAddOn`, `locale`, `className`.

There is no built-in checkout: every CTA is a callback and/or a link. A
custom-plan card links to the catalog's configured URL.
