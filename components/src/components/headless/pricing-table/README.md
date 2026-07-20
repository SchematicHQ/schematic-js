# PricingTable (headless)

An unstyled, accessible, composable pricing table. Unlike the styled `elements/`
component, it ships no visual styling of its own — you own the markup and CSS,
and you map over your own plan/add-on data. It is **controlled**: pass the
available `periods`/`currencies` (and the plans you render); it fetches nothing.
`Root` owns only the interactive period/currency selection.

## Usage

### Compound components

```tsx
import { PricingTable } from "@schematichq/schematic-components";
import type { CompanyPlanDetailResponseData } from "@schematichq/schematic-react";

function PricingTableExample() {
  // Your own hook that supplies the data (e.g. built on useAvailablePlans /
  // useAvailableCurrencies). The headless component never fetches.
  const { plans, addOns, currencies, periods } = usePricingOptions();

  return (
    <PricingTable.Root periods={periods} currencies={currencies}>
      {(currencies.length > 1 || periods.length > 1) && (
        <>
          {currencies.length > 1 && (
            <PricingTable.CurrencyToggle>
              {currencies.map((currency) => (
                <PricingTable.CurrencyOption key={currency} value={currency}>
                  {currency.toUpperCase()}
                </PricingTable.CurrencyOption>
              ))}
            </PricingTable.CurrencyToggle>
          )}

          {periods.length > 1 && (
            <PricingTable.PeriodToggle>
              {periods.map((period) => (
                <PricingTable.PeriodOption key={period} value={period}>
                  {period}
                </PricingTable.PeriodOption>
              ))}
            </PricingTable.PeriodToggle>
          )}
        </>
      )}

      <PricingTable.Label>Plans</PricingTable.Label>
      <PricingTable.Section>
        {plans.map((plan: CompanyPlanDetailResponseData) => (
          <PricingTable.Card key={plan.id} active={plan.current}>
            <PricingTable.Name>{plan.name}</PricingTable.Name>
            <PricingTable.Description>{plan.description}</PricingTable.Description>
            <PricingTable.Price>{/* your formatted price */}</PricingTable.Price>
            <PricingTable.Entitlements>
              {(plan.entitlements ?? []).map((entitlement) => (
                <PricingTable.Entitlement key={entitlement.id}>
                  {entitlement.feature?.name}
                </PricingTable.Entitlement>
              ))}
            </PricingTable.Entitlements>
            <PricingTable.Footer>
              <PricingTable.CallToAction active={plan.current}>
                {plan.current ? "Current plan" : "Choose plan"}
              </PricingTable.CallToAction>
            </PricingTable.Footer>
          </PricingTable.Card>
        ))}
      </PricingTable.Section>

      <PricingTable.Label>Add-ons</PricingTable.Label>
      <PricingTable.Section>
        {addOns.map((addOn: CompanyPlanDetailResponseData) => (
          <PricingTable.Card key={addOn.id} active={addOn.current}>
            <PricingTable.Name>{addOn.name}</PricingTable.Name>
            {/* … */}
          </PricingTable.Card>
        ))}
      </PricingTable.Section>
    </PricingTable.Root>
  );
}
```

The data-bearing parts (`Name`, `Description`, `Price`, `Entitlement`, …) are
intentionally thin: they render your children inside a consistently-attributed,
themeable element. **You** compute prices, entitlement copy, and currency/period
formatting (using the same `utils` helpers the styled component uses, or your
own). The headless layer owns composition, accessibility, and the period/currency
selection — not pricing math.

### Selection: controlled or uncontrolled

`Root` manages the selected period/currency itself, seeded by `defaultPeriod` /
`defaultCurrency` (falling back to the first entry of `periods` / `currencies`).
To drive it yourself, pass `period` / `currency` plus `onPeriodChange` /
`onCurrencyChange`:

```tsx
const [period, setPeriod] = useState("year");
<PricingTable.Root periods={periods} period={period} onPeriodChange={setPeriod}>
  …
</PricingTable.Root>;
```

### `asChild` (polymorphism)

Any part can render as your own element via `asChild`; the headless props,
attributes, and ref are merged onto the child.

```tsx
<PricingTable.Card asChild active>
  <article className="card">…</article>
</PricingTable.Card>
```

### Hook-only (fully custom markup)

```tsx
import { usePricingTable } from "@schematichq/schematic-components";

const table = usePricingTable({ periods, currencies });
<div {...table.getRootProps()}>
  <div {...table.getPeriodToggleProps()}>
    {table.periods.map((p) => (
      <button key={p} {...table.getPeriodOptionProps(p)}>
        {p}
      </button>
    ))}
  </div>
</div>;
```

## Accessibility

The period toggle renders as `role="radiogroup"` with an `aria-label`; each
option is `role="radio"` with `aria-checked` reflecting the selection. The
currency toggle renders as a native `<select>` (with `<option>` children), so it
gets native keyboard/screen-reader support for free; give it an accessible name
via `aria-label` (a default `aria-label="Currency"` is applied). The current
plan's `Card` carries `aria-current="true"`. Provide readable text inside each
part — the headless layer never invents copy.

## Styling hooks

Every part exposes `data-schematic` / `data-part` attributes and BEM-style
classes under `schematic-pricing-table`: `__label`, `__section`, `__card`,
`__name`, `__description`, `__price`, `__entitlements`, `__entitlement`,
`__footer`, `__call-to-action`, `__period-toggle`, `__period-option`,
`__currency-toggle`, `__currency-option`. State attributes for styling:

| Attribute                          | Applies to                          |
| ---------------------------------- | ----------------------------------- |
| `data-period` / `data-currency`    | root — the current selection        |
| `data-active="true"`               | the current plan's card / CTA       |
| `data-selected="true"`             | the selected period/currency option |
