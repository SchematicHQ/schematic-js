# OverageLimit

How far past zero a credit the company's plan bills at the end of the period may go before usage pauses: the limit in force, what it would cost, and how much of it this period has used. Where the plan allows, the company changes the limit in place or returns it to the plan's default.

## Hooks and derivation

`useOverageLimit({ creditId })` reads the credit balances (`GET /company/credits`) and picks one credit's `overdraft`, which the server sends only for a credit the plan bills in arrears. Without `creditId` it takes the company's only such credit. `data` is `{ balance, overdraft }`; `null` once the balances load when there is no such credit, or when several have one and no `creditId` picked one, which `ambiguous` reports; `undefined` until they load. `pickOverageCredit(balances, creditId)` is the same rule as a pure function. A 404 means the account is not on the `company-context-api` flag and surfaces as an error.

`overdraft` carries, in credits: `overdraftLimit` (the limit in force, `null` for none), `planDefaultLimit`, `companyLimit`, `adminLimit`, `maxLimit` (the most the company may set: the plan's `planMaxLimit`, or the provider's cap when lower; `null` for no maximum) and `debt` (credits used past zero). `limitSource` says whether the plan, the company or the provider's cap set the limit, which the card words as "set by your provider" for a cap. A cap only ever lowers the limit. `canChangeLimit` says whether the plan lets the company set its own, and `postpaidRatePerUnit` prices one credit in `currency`'s minor unit, with `postpaidRatePerUnitDecimal` for rates finer than one.

`save({ overdraftLimit })` sets the company's own limit (`PUT /company/credits/:credit_id/overdraft`) and `reset()` returns it to the plan's default (`DELETE` on the same route); the balances reload once either lands. Both reject with the failure and record it on `mutationError`, with `isMutating` true while one is in flight. The server refuses a limit of zero or less, one above `maxLimit`, and any write where `canChangeLimit` is false. A host's own `billingClient` without `updateCreditOverdraft` and `resetCreditOverdraft` reads the limit but cannot change it.

`deriveOverageLimit` turns `{ balance, overdraft }` into display parts: the limit, the plan's default, the maximum and what was used, each as credits with the credit's name for that amount and the money beside it (`null` without a rate or currency), what is left, the percent used, a `tone` (`ok`, `warning` from `warnAt`, `blocked` at the limit), who set the limit (`source`), and the balance's reset date. `validateOverageLimit` reads a typed limit as the locale writes numbers and checks it against zero and `maxLimit`.

```tsx
import {
  deriveOverageLimit,
  useOverageLimit,
} from "@schematichq/schematic-components/elements";

function Cap() {
  const { data, save } = useOverageLimit({ creditId: "bcr_ai" });
  if (data === undefined) return <Spinner />;
  if (data === null) return null;

  const view = deriveOverageLimit(data, { locale: "en-US" });
  return (
    <p>
      {view.limit?.amount ?? "No limit"} · {view.used.amount} used
      {view.editable && (
        <button onClick={() => void save({ overdraftLimit: 5000 })}>
          5,000
        </button>
      )}
    </p>
  );
}
```

## The styled element

```tsx
<OverageLimit creditId="bcr_ai" onSaved={() => toast("Limit saved")} />
```

| Prop                  | Default | Effect                                                                           |
| --------------------- | ------- | -------------------------------------------------------------------------------- |
| `creditId`            | —       | The credit to show; the company's only credit with an overage limit when absent. |
| `allowEdit`           | `true`  | Change and reset, where the plan allows them. `false` is read-only either way.   |
| `showUsage`           | `true`  | The meter and the extra credits used.                                            |
| `warnAt`              | `80`    | Percent of the limit used that turns the card amber.                             |
| `onSaved`             | —       | Called once a new limit or a reset has saved.                                    |
| `headingLevel`        | `2`     | The heading's level.                                                             |
| `className`, `locale` | —       | Root class; BCP 47 tag for formatting.                                           |
| `strings`             | —       | Copy for this element by key; wins over the provider's.                          |

The card names the credit and its price per extra credit, then the limit in credits with "About $40.00" and who set it beside it. With nothing used past zero it explains what the limit does; once usage passes zero, a meter fills toward the limit with what was used, its cost and what is left. From `warnAt` the meter and the count turn amber with a warning; at the limit they turn red, "Change limit" becomes the primary action, and a second line names the date the plan's credits renew when the balance has one. With no limit there is no meter, only what was used.

"Change limit" opens an inline form: the limit in credits, what it would cost, and the plan's maximum. It refuses a value of zero or less, or above the maximum, before sending it, and shows the server's reason in the form when a save is refused. "Use plan default" in the form and "Reset to plan default" on the card show only when the company has set a limit of its own. A plan that does not let the company change the limit shows "Your plan sets this limit." (or "Your provider sets this limit." under a provider's cap) and no actions.

Renders nothing for a company with no credit billed past zero, for a `creditId` that names a credit without one, and for several such credits with no `creditId`, which also logs a warning in development.

The form's field uses the shared `schematic-field` and `schematic-input` classes, as PaymentMethods' form does.

## Localizing it

The card's copy is under `overageLimit*`: `overageLimitSource*` for who set the limit, `overageLimitBlocked*` for the limit reached, and `overageLimitInvalid` / `overageLimitAboveMax` for the form's checks.
