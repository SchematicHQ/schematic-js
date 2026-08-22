# schematic-components v3

Code-first React elements on the catalog API. Each element reads one or two
resources through hooks from `@schematichq/schematic-react`, reduces them to
a domain model with a pure derivation, and renders with CSS-variable styling.

| Element          | Hooks                                    | Derivation              | Recipe                                         |
| ---------------- | ---------------------------------------- | ----------------------- | ---------------------------------------------- |
| PricingTable     | `useCatalog`                             | `derivePlanOfferings`   | [pricing-table.md](./pricing-table.md)         |
| PlanManager      | `useCompany` + `useCatalog`              | `derivePlanSummary`     | [plan-manager.md](./plan-manager.md)           |
| IncludedFeatures | `useFeatureUsage` (+ company, catalog)   | `deriveUsage`           | [included-features.md](./included-features.md) |
| MeteredFeatures  | `useFeatureUsage` (+ company, catalog)   | `deriveUsage`           | [metered-features.md](./metered-features.md)   |
| CreditUsage      | `useCreditBalances` (+ catalog, company) | `deriveCreditBalances`  | [credit-usage.md](./credit-usage.md)           |
| Invoices         | `useInvoices`                            | `deriveInvoiceList`     | [invoices.md](./invoices.md)                   |
| UpcomingBill     | `useUpcomingInvoice` + `useCompany`      | `deriveUpcomingInvoice` | [upcoming-bill.md](./upcoming-bill.md)         |

## Setup

```tsx
import { SchematicProvider } from "@schematichq/schematic-react";
import {
  PlanManager,
  SchematicStyles,
} from "@schematichq/schematic-components/v3";

<SchematicProvider
  publishableKey="pk_…"
  accessToken={async () => (await fetch("/api/access-token")).json()}
>
  <SchematicStyles />
  <PlanManager onChangePlan={() => router.push("/plans")} />
</SchematicProvider>;
```

`accessToken` is optional: with only a publishable key, `PricingTable` shows
the public catalog and the company elements report the missing token in
their status frame. For server rendering, `fetchCatalogData(client)` in
schematic-js returns an `initialData` bag the provider seeds from.

## Styling

`<SchematicStyles />` injects one stylesheet driven by `--schematic-*`
custom properties: `accent`, `background`, `border`, `card-divider`,
`card-padding`, `danger`, `font-body`, `font-heading`, `meter-track`,
`muted`, `primary`, `primary-contrast`, `radius`, `shadow`, `space`, `text`,
`warning`. Override them on `:root` or any ancestor. Or skip the stylesheet
and target the `.schematic-*` class names yourself.

## Calls to action

No element performs checkout. Every CTA is an `onX` callback and/or a URL
prop (`onSelectPlan` / `callToActionUrl`, `onChangePlan` / `changePlanUrl`,
`onAddMore` / `addMoreUrl`, `onBuyBundle` / `buyMoreUrl`,
`onEditAutoTopup` / `editAutoTopupUrl`).

## Contract

The data shapes are a proposal derived from these elements; see
[contract-diff.md](./contract-diff.md) for the field-by-field comparison
with RFC 0007.
