# PlanManager

The company's current plan: name and price, the one notice that applies (trial, cancellation, custom-billing invoice, scheduled downgrade), held add-ons, usage-based entitlements, included credits with auto top-up, and a "Change plan" call to action.

## From the hooks

`useCompany()` is the only requirement. `useCatalog()` adds the trial landing plan, the usage-based rows, and the credits when the company holds an access token.

```tsx
import {
  derivePlanSummary,
  useCatalog,
  useCompany,
} from "@schematichq/schematic-components/v3";

function CurrentPlan() {
  const { data: company } = useCompany();
  const { data: catalog } = useCatalog();
  if (company === undefined) return null;
  const summary = derivePlanSummary({ company, catalog }, { locale: "en-US" });
  return (
    <div>
      <h2>{summary.plan?.name ?? "No plan"}</h2>
      {summary.plan?.price.kind === "priced" && (
        <span>{summary.plan.price.text}</span>
      )}
      {summary.addOns.map((line) => (
        <p key={line.id}>{line.name}</p>
      ))}
      {summary.canChangePlan && <button type="button">Change plan</button>}
    </div>
  );
}
```

`PlanSummary` carries the plan (`price.kind` is `free`, `usage_based`, `custom`, or `priced` with `text` and `periodShort`), `addOns`, `usageBased`, `credits`, `autoTopups`, the single `notice`, `canChangePlan`, and `renewsAt`.

## The element

```tsx
<PlanManager
  onChangePlan={(summary) => openCheckout(summary)}
  editAutoTopupUrl="/billing/credits"
/>
```

| Prop                                                           | Default               | Effect                                         |
| -------------------------------------------------------------- | --------------------- | ---------------------------------------------- |
| `showHeader`, `showDescription`, `showPrice`                   | `true`                | Plan name, description, price line             |
| `showNotice`, `showRenewal`                                    | `true`                | The notice; "Renews on" when no notice applies |
| `showAddOns`, `showUsageBased`, `showCredits`, `showAutoTopup` | `true`                | The sections                                   |
| `showZeroPriceAsFree`                                          | `false`               | "$0.00" as "Free"                              |
| `showCallToAction`, `callToActionText`                         | `true`, "Change plan" | The call to action                             |
| `onChangePlan`, `changePlanUrl`, `changePlanTarget`            | —                     | Callback and/or link for the call to action    |
| `onEditAutoTopup`, `editAutoTopupUrl`                          | —                     | Callback and/or link for an auto top-up "Edit" |
| `now`                                                          | wall clock            | "Now" for the trial countdown                  |
| `locale`, `className`                                          | viewer's language     | Formatting and the root class                  |

The call to action stays hidden while a payment-activated custom plan is unpaid; the notice's "Pay now" link takes its place.
