# BalanceBadge

One credit's balance as a pill for the app shell: what is left, a meter of the share used, and when it resets. It turns amber near a limit and red at one, and hovering or focusing it shows the exact reset and the viewer's spend limits.

## It needs `SchematicProvider`

Unlike the other elements, BalanceBadge reads the DataStream as well as the billing API, so it throws under a bare `BillingProvider` or `BillingDataProvider`. The billing balance shows first. Once the host calls `identify()` on the Schematic client, the stream's live balance replaces it and the viewer's spend limits count toward the state. Without `identify()` the badge shows the billing balance alone.

The stream is keyed by the keys passed to `identify()`, and billing by the company the `session` names. The badge can't check that they agree, so identify the company the session names.

## Hooks and derivation

`useCreditBalances()` reads the billing balances, as CreditUsage does. Two DataStream hooks from schematic-react carry the live side: `useSchematicCreditBalance(creditId)` gives the spendable balance, including any open lease hold, and `useSchematicCreditSpendPolicies()` gives the company and user spend policies that bind the identified user. `useSchematicCreditBalance` reports `0` while the stream has no balance for the credit; the element reads the client directly so that it can tell "none yet" from an empty balance.

`deriveBalanceBadge(balances, options)` picks the credit and works out the state. It returns `null` when there is nothing to show.

- `creditId` names the credit. Without it the badge takes the company's only credit, and with several it takes none.
- `liveRemaining` replaces the billing `remaining`.
- `policies` are the stream's spend policies. Window limits on the credit are compared with the balance. A limit sets `tone`, `percent` and `resetsAt` once it is tighter than the balance and at `warnAt` or over; until then the balance does. Per-use limits don't drive the state; the smallest shows as `perUse`.
- `warnAt` (default 80) is the percent used that turns the badge amber; 100% blocks it.

A company's `billing_period` limit reads as monthly, as UsageControls shows it.

```tsx
import {
  deriveBalanceBadge,
  useCreditBalances,
  useSchematicCreditSpendPolicies,
} from "@schematichq/schematic-components/elements";

function Balance() {
  const { data } = useCreditBalances();
  const { policies } = useSchematicCreditSpendPolicies();
  const view = data && deriveBalanceBadge(data, { locale: "en-US", policies });
  if (!view) return null;

  return (
    <span data-tone={view.tone}>
      {view.remaining.amount} {view.remaining.units} · {view.percent}% used
    </span>
  );
}
```

## The styled element

```tsx
<BalanceBadge creditId="bcr_ai" href="/billing" />
```

| Prop                  | Default                   | Effect                                                  |
| --------------------- | ------------------------- | ------------------------------------------------------- |
| `creditId`            | the company's only credit | The credit to show.                                     |
| `href`, `target`      | —                         | The pill links here.                                    |
| `onClick`             | —                         | The pill is a button that calls this; wins over `href`. |
| `showMeter`           | `true`                    | The meter of the share used.                            |
| `showReset`           | `true`                    | When the balance or limit resets.                       |
| `warnAt`              | `80`                      | Percent used that turns the badge amber.                |
| `className`, `locale` | —                         | Root class; BCP 47 tag for formatting.                  |
| `strings`             | —                         | Copy for this element by key; wins over the provider's. |

| State           | Pill                                             |
| --------------- | ------------------------------------------------ |
| Under `warnAt`  | "2,450 AI credits", the meter, "Resets Aug 31"   |
| Warning         | Amber; a reset within a day reads "Resets in 6h" |
| Balance ran out | Red, "Out of AI credits · Unlocks Aug 31"        |
| A limit reached | Red, "Daily limit reached · Unlocks 12:00 AM"    |
| Loading         | A pill-shaped skeleton                           |

Without either `href` or `onClick` the pill is focusable but does nothing, so the tooltip still reaches a keyboard. The tooltip lists the balance and its reset, each window limit with its reset in the viewer's time zone, and the per-use limit. The badge renders nothing when the company holds no credit, when it holds several and `creditId` is absent, and on any error; in development it logs why.

## Localizing it

The pill's and tooltip's copy is under `balanceBadge*`.
