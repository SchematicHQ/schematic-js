# CreditUsage

The company's credit balances in one card, a section per credit: what is left, the grants behind it, how the plan's grants add up, and who on the team spent it.

## Hooks and derivation

`useCreditBalances()` serves `GET /company/credits`. `data` is a `CreditBalanceEntry[]`; an empty list is a loaded answer. A 404 means the account is not on the `company-context-api` flag and surfaces as an error.

The server has done what the embed used to do with the raw ledger:

- Only live grants are listed, newest first; expired and zeroed-out ones are gone, so `total` is `used` plus `remaining`.
- A credit the plan draws on that the company holds none of is here as a zero balance with no grants.
- Each grant carries `resetsAt` or `expiresAt`, never both.
- `purchasable` says whether a bundle of the credit is on offer to the company's plan.
- `composition` states how a per-license plan grant adds up per period.

`deriveCreditUsage` turns the balances into display parts: each credit's remaining amount (to ten fraction digits), its ledger rows by `kind` (`plan`, `bundle`, `autoTopup`, `promotional`) with their dates, and the composition, where the renewal day is an ordinal.

`useCreditUserUsage(creditId)` serves `GET /company/credits/:credit_id/users`: the heaviest 20 users of a credit over the span of its live grants. A credit the company holds no live grant of gets an empty breakdown, so the element doesn't ask for one.

```tsx
import {
  deriveCreditUsage,
  useCreditBalances,
} from "@schematichq/schematic-components/elements";

function Credits() {
  const { data } = useCreditBalances();
  if (data === undefined) return <Spinner />;

  return deriveCreditUsage(data, { locale: "en-US" }).map((credit) => (
    <p key={credit.creditId}>
      {credit.name}: {credit.remaining.amount} {credit.remaining.units} left
    </p>
  ));
}
```

## The styled element

```tsx
<CreditUsage onBuyMore={(credit) => openTopUp(credit.creditId)} />
```

| Prop                          | Default | Effect                                                          |
| ----------------------------- | ------- | --------------------------------------------------------------- |
| `showHeader`                  | `true`  | The "Credits" heading.                                          |
| `showIcon`                    | `true`  | Each credit's icon; the circle is held even without one.        |
| `showDescription`             | `true`  | Each credit's description.                                      |
| `showUsage`                   | `true`  | What is left of each credit.                                    |
| `showUsageByUser`             | `true`  | The breakdown of consumption by user.                           |
| `visibleCredits`              | —       | Credit ids to show, in this order; every credit when absent.    |
| `onBuyMore`                   | —       | "Buy More" on a purchasable credit calls this with the balance. |
| `buyMoreUrl`, `buyMoreTarget` | —       | "Buy More" links here when there is no `onBuyMore`.             |
| `headingLevel`                | `2`     | The heading's level; each credit's name sits one below.         |
| `className`, `locale`         | —       | Root class; BCP 47 tag for formatting.                          |
| `strings`                     | —       | Copy for this card by key; wins over the provider's.            |

"Buy More" shows only on a credit a bundle sells to the company's plan, and only when the host gives it somewhere to go. "See balance details" opens the ledger, three grants at a time; a credit with no grants shows neither the ledger nor usage by user. A company with no credits, and a plan that draws on none, renders nothing.

## Localizing it

The card's copy is under `creditUsage*`; the per-user list shares `usageByUser*` with MeteredFeatures.
