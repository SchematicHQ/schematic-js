# PricingTable

The catalog's plans and add-ons, priced in the period and currency the reader picks. On a marketing page nobody has signed in to it shows the public catalog; signed in, it shows the company's view of the same catalog, with the current plan marked and the plans the company cannot move to held back.

## Hooks and derivation

`useCatalog({ catalogId? })` follows the credential. With a session it reads `GET /catalog/view` (or `/catalogs/{id}/view`): each plan and add-on with the company's standing against it (`current`, `valid` and `invalidReason`, `usageViolations`, `companyCanTrial`), and whether the company can check out. With no session, or before the host's auth resolves, it reads `GET /public/catalog` (or `/public/catalogs/{id}`) with the publishable key `SchematicProvider` was given, and a session starting swaps one for the other. `data.source` says which it is: `"company"` or `"public"`. A 404 from either means the account is not on the `multi-product-catalog` flag.

The element also reads `useCompany()` in company mode, for the period the subscription bills in: the current plan is current only in that period, and the table opens on it. A company that fails to load costs only that.

`derivePricingTable` turns them into display parts:

- `periods` and `currencies`: what the catalog prices in, months before quarters before years. `period` and `currency` are the ones asked for when the catalog offers them, else the subscription's period and the catalog's default currency, else the first.
- `plans` and `addOns`: a card each, priced in that period and currency. A card with prices but none in the currency is left out, and a recurring one with none in the period; a one-time add-on is priced once. A plan priced at zero reads "Usage-based" when a feature is priced, and "Free" only with `showZeroPriceAsFree`.
- Each card's `credits`: the included credits the catalog shows, one line per credit. A credit granted per license and to the company outright reads as the per-license line with the company's share in `plus`. A credit hidden in the catalog stays in the plan's `includedCreditGrants`, since a checkout still prices it.
- `savings`: what the company's current plan saves by period against paying monthly, as a formatted percentage. Empty in the public catalog.
- Each card's `entitlements`: what each feature grants, a line beneath for an overage price or a tiered one, its tiers, and its hard limit.
- Each card's `action`, in company mode: `current`, `choose` (with `upgrade` for a plan above the current one), `remove` or `change` for a held add-on, `overLimit` with the violations, `downgradeBlocked` with the account's link, or `unavailable` when the company cannot check out. `null` in the public catalog.
- `customPlan`: the catalog's custom-plan call to action, when it offers one.

```tsx
import {
  derivePricingTable,
  useCatalog,
} from "@schematichq/schematic-components/elements";

function PlanNames() {
  const { data } = useCatalog();
  if (!data) return <Spinner />;

  const view = derivePricingTable(data, { locale: "en-US", period: "year" });
  return (
    <ul>
      {view.plans.map((plan) => (
        <li key={plan.id}>
          {plan.name}
          {plan.action?.kind === "current" && " (yours)"}
        </li>
      ))}
    </ul>
  );
}
```

## The styled element

```tsx
<PricingTable onSelectPlan={(selection) => openCheckout(selection)} />
```

The table opens nothing itself. A card's action calls `onSelectPlan` with the plan or add-on, the price the card shows, its period, the currency and any trial; a host with a checkout opens it there, and one on a marketing page sends the visitor to sign up. Without `onSelectPlan`, `callToActionUrl` makes each action a link; without either, cards have no action. The custom plan links to the catalog's own URL, and a blocked downgrade to the account's.

| Prop                                    | Default | Effect                                                                                                                   |
| --------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| `catalogId`                             | —       | The catalog to show; the environment's when absent.                                                                      |
| `onSelectPlan`                          | —       | A card's action calls this with the selection.                                                                           |
| `callToActionUrl`, `callToActionTarget` | —       | A card's action links here when there is no `onSelectPlan`.                                                              |
| `period`, `defaultPeriod`               | —       | The period shown, controlled or initial.                                                                                 |
| `onPeriodChange`                        | —       | Called when the reader picks a period.                                                                                   |
| `currency`, `defaultCurrency`           | —       | The currency shown, lowercase, controlled or initial.                                                                    |
| `onCurrencyChange`                      | —       | Called when the reader picks a currency.                                                                                 |
| `showHeader`                            | `true`  | "Plans" and "Add-ons" above their cards.                                                                                 |
| `showPlans`                             | `true`  | The plans and the custom plan.                                                                                           |
| `showAddOns`                            | `true`  | The add-ons.                                                                                                             |
| `showPeriodToggle`                      | `true`  | The period toggle, when there is more than one period, with a tip saying what a longer period saves on the current plan. |
| `showCurrencySelector`                  | `true`  | The currency picker, when there is more than one currency.                                                               |
| `showDescription`                       | `true`  | Each card's description.                                                                                                 |
| `showEntitlements`                      | `true`  | Each card's features.                                                                                                    |
| `showFeatureIcons`                      | `true`  | Each feature's and credit's icon.                                                                                        |
| `showFeatureDescriptions`               | `false` | Each feature's description.                                                                                              |
| `showInclusionText`                     | `true`  | "Everything in {plan}, plus" above each plan's features but the first.                                                   |
| `showCredits`                           | `true`  | Each plan's included credits, and the credits per use on its features.                                                   |
| `showZeroPriceAsFree`                   | `false` | A plan priced at zero reads "Free".                                                                                      |
| `showHardLimit`                         | `false` | An info tip with the hard limit on features billed past it.                                                              |
| `showWarningThresholdAsLimit`           | `false` | An entitlement's warning threshold in place of its limit.                                                                |
| `headingLevel`                          | `2`     | The level of "Plans" and "Add-ons"; card names sit one below.                                                            |
| `className`, `locale`                   | —       | Root class; BCP 47 tag for formatting.                                                                                   |
| `strings`                               | —       | Copy for this table by key; wins over the provider's.                                                                    |

Each card shows four features before "See all". With `onSelectPlan` opening a checkout that changes the plan without leaving the page, call the function `useInvalidateBillingData()` returns once it is done, and the table reloads with the new current plan.

Server-rendered, prefetch with `fetchBillingData(client, { names: billingResources(PricingTable) })`: a resource the client cannot read, the company's view with no session or the public catalog with no key, is left out rather than failing the page.

## Localizing it

The table's copy is under `pricingTable*`. It shares `usageUnits`, `usagePerUnit`, `usagePerPackage`, `usageUnlimited` and the tier and hard-limit tips with the usage elements, and the period names `periodDay` through `periodYear` and their `*Short` suffixes.
