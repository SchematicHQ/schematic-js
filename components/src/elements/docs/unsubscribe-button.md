# UnsubscribeButton

A button that cancels the company's subscription at the end of its billing period, after a confirmation that says when access ends and what the subscription costs.

## Hooks and derivation

`useUnsubscribe()` returns `unsubscribe`, `isMutating` and `mutationError`. Calling `unsubscribe()` sends `DELETE /checkout/unsubscribe`, which sets the subscription to cancel at period end, then refetches whichever of the company, upcoming invoice and credit balances are already loaded. It rejects on failure and keeps the error on `mutationError`; `isMutating` is true while the request runs. The server refuses with a 400 when the company has no subscription, when the subscription is already set to cancel, or when another Stripe app manages it.

`deriveUnsubscribe` reads the company from `useCompany()` and its usage from `useFeatureUsage()`:

- `canUnsubscribe`: there is a subscription with no cancellation date. The status alone does not hide the button.
- `accessEndsOn`: the cancellation date, else the next bill date, else today.
- `plan`, `addOns` and `total`: the plan, the recurring add-ons, and everything paid in advance.

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
    <button
      disabled={isMutating}
      onClick={() => unsubscribe().catch(() => {})}
    >
      Cancel at period end
    </button>
  );
}
```

Read the failure from `mutationError`.

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

"Not ready to cancel?" and "Manage plan" show only when the host gives them somewhere to go. A failed cancellation says "Unsubscribe failed" and leaves the confirmation open; the server's reason stays on the hook. The button renders nothing until the company and its feature usage load, and nothing once the subscription has a cancellation date. A failed read shows the error with a retry; a 404 says the subscription is not available for this account.

## Localizing it

The copy is under `unsubscribe*`.
