# UnsubscribeButton

A button, in a card as the embed draws it, that cancels the company's subscription at the end of its billing period, after a confirmation that says when access ends and what the subscription costs.

## Hooks and derivation

`useUnsubscribe()` calls `DELETE /checkout/unsubscribe`, which sets the subscription to cancel at period end. The store then reloads what that changes and anyone is reading: the company, its next bill, and its credits. `unsubscribe()` rejects with the failure and records it on `mutationError`; `isMutating` is true while it runs. The server refuses a company with no single active subscription, or one already set to cancel.

`deriveUnsubscribe` reads the company from `useCompany()` and its usage from `useFeatureUsage()`:

- `canUnsubscribe`: there is a subscription, and it has no cancellation date.
- `accessEndsOn`: the next bill's date, else today.
- `plan`, `addOns` and `total`: the plan, the add-ons, and the recurring total per `period` — the plan, the recurring add-ons, and what is paid in advance.

```tsx
import {
  useCompany,
  useUnsubscribe,
} from "@schematichq/schematic-components/elements";

function CancelLink() {
  const { data: company } = useCompany();
  const { unsubscribe, isMutating } = useUnsubscribe();
  if (!company?.subscription || company.subscription.cancelAt) return null;

  return (
    <button disabled={isMutating} onClick={() => unsubscribe()}>
      Cancel at period end
    </button>
  );
}
```

## The styled element

```tsx
<UnsubscribeButton managePlanUrl="/checkout" onUnsubscribed={showGoodbye} />
```

| Prop                                | Default | Effect                                                    |
| ----------------------------------- | ------- | --------------------------------------------------------- |
| `onManagePlan`                      | —       | "Manage plan" in the confirmation calls this.             |
| `managePlanUrl`, `managePlanTarget` | —       | "Manage plan" links here when there is no `onManagePlan`. |
| `onUnsubscribed`                    | —       | Called once the subscription is set to cancel.            |
| `className`, `locale`               | —       | Root class; BCP 47 tag for formatting.                    |
| `strings`                           | —       | Copy for this element by key; wins over the provider's.   |

"Not ready to cancel?" and "Manage plan" show only when the host gives them somewhere to go. A failed cancellation says "Unsubscribe failed" and leaves the confirmation open; the server's reason stays on the hook. The button renders nothing until the company loads, and nothing once the subscription is set to end.

Where it departs from the embed: the add-ons and their prices are the ones the company holds at what it is billed, where the embed listed the catalog's add-ons it holds at catalog prices.

## Localizing it

The copy is under `unsubscribe*`.
