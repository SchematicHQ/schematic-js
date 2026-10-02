# PlanManager

The company's plan: a notice about where its subscription is headed, the plan and its price, its add-ons, its usage-based features, and the credits the plan and the company's purchases bring.

## Hooks and derivation

`useCompany()` serves `GET /company`: the plan and add-ons at the prices the company is billed, the subscription's state, any scheduled downgrade, and the newest pending custom plan billing. A company with several subscriptions has no `subscription`. A 404 means the account is not on the `company-context-api` flag and surfaces as an error.

The element also reads `useFeatureUsage()` for the usage-based features and `useCreditBalances()` for the credits, and waits for all three.

`derivePlanManager` turns them into display parts:

- `notice`: at most one, in the embed's order — a trial that is not cancelling (`trial`, counted down in whole days, else hours, minutes or seconds), a cancellation (`canceled`, which needs both `cancelAt` and `cancelAtPeriodEnd`), a custom plan's invoice (`customPlanBilling`), then a scheduled downgrade.
- `plan`: the name, the description, and the price per the subscription's period; a free plan with usage-based features reads "Usage-based", and "Free" only with `showZeroPriceAsFree`.
- `addOns`: each held add-on at its price, per the plan's period, or once for a one-time add-on.
- `usageBased`: each feature with a price behavior — its limit, its unit or package price (the last tier's past an overage soft limit), its credits per use, and what an allocation paid in advance costs.
- `planCredits`: the plan's grants of each credit summed, in the plan's order, worded per license where the plan grants per license.
- `autoTopup`: the plan's credits the company may top up itself.
- `topUps`, `bundles`, `promotional`: the other grants, a row per bundle (or per grant outside one), newest first.

```tsx
import {
  derivePlanManager,
  useCompany,
  useCreditBalances,
  useFeatureUsage,
} from "@schematichq/schematic-components/elements";

function PlanName() {
  const company = useCompany();
  const usage = useFeatureUsage();
  const credits = useCreditBalances();
  if (!company.data || !usage.data || !credits.data) return <Spinner />;

  const view = derivePlanManager(
    {
      company: company.data,
      creditBalances: credits.data,
      featureUsage: usage.data,
    },
    { locale: "en-US" },
  );
  return <p>{view.plan?.name ?? "No plan"}</p>;
}
```

## The styled element

```tsx
<PlanManager changePlanUrl="/checkout" onEditAutoTopup={openTopUpSettings} />
```

| Prop                                      | Default | Effect                                                                    |
| ----------------------------------------- | ------- | ------------------------------------------------------------------------- |
| `showNotice`                              | `true`  | The notice above the plan.                                                |
| `showHeader`                              | `true`  | The plan's name, description and price.                                   |
| `showDescription`                         | `true`  | The plan's description.                                                   |
| `showPrice`                               | `true`  | The plan's price.                                                         |
| `showAddOns`                              | `true`  | The add-ons.                                                              |
| `showUsageBased`                          | `true`  | The usage-based features.                                                 |
| `showCredits`                             | `true`  | Every credit section, and the credits per use on credit-burning features. |
| `showLabels`                              | `true`  | Each section's label.                                                     |
| `showZeroPriceAsFree`                     | `false` | A plan priced at zero reads "Free".                                       |
| `showHardLimit`                           | `false` | An info tip with the hard limit on features billed past it.               |
| `showWarningThresholdAsLimit`             | `false` | An entitlement's warning threshold in place of its limit.                 |
| `onChangePlan`                            | —       | "Change plan" calls this.                                                 |
| `changePlanUrl`, `changePlanTarget`       | —       | "Change plan" links here when there is no `onChangePlan`.                 |
| `onEditAutoTopup`                         | —       | "Edit" on the auto top-up settings calls this.                            |
| `editAutoTopupUrl`, `editAutoTopupTarget` | —       | "Edit" links here when there is no `onEditAutoTopup`.                     |
| `headingLevel`                            | `2`     | The plan name's level; a notice's title sits one below.                   |
| `className`, `locale`                     | —       | Root class; BCP 47 tag for formatting.                                    |
| `strings`                                 | —       | Copy for this card by key; wins over the provider's.                      |

"Change plan" and "Edit" show only when the host gives them somewhere to go, and "Change plan" not while a custom plan waits on payment to activate. Each credit section shows three rows before "See all".

Where it departs from the embed: the trial notice leaves out what happens after the trial, since the post-trial plan is catalog configuration that no company-tier route serves yet; and `showCredits` hides the bundle and promotional sections too.

## Localizing it

The card's copy is under `planManager*`; the full period names are `periodDay` through `periodYear`.
