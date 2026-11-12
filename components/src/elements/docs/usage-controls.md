# UsageControls

The limits on the company's credit spend: caps on the whole company and on single members, per period or per use, each with when it resets, and how much is spent once a limit is nearly or fully used. With `allowEdit`, people can add, change and remove limits from inside your product.

## Hooks and derivation

`useCreditSpendPolicies({ credits? })` reads every spend policy that applies in the company (`GET /company/credits/spend-policies`) and returns `create`, `update` and `remove` beside the list. Each write reloads the list and every `useCreditUserUsage`, so a member's cap and their usage stay in step. One list backs every call, so `credits` filters without another request. The routes sit behind the `company-context-api` and `billing.credit-spend-policies` flags; with either off they answer 404.

```tsx
const { data, create, update, remove } = useCreditSpendPolicies({
  credits: ["bcr_ai"],
});

// The whole company: 2,000 credits a billing period.
await create({
  creditId: "bcr_ai",
  windowAmount: 2000,
  windowUnit: "billing_period",
});
// One member: 500 credits a day.
await create({
  creditId: "bcr_ai",
  userId,
  windowAmount: 500,
  windowUnit: "day",
});
// One member: at most 25 credits on any single use.
await create({ creditId: "bcr_ai", userId, maxPerDraw: 25 });
await update(policy.id, { windowAmount: 750 });
await remove(policy.id);
```

A policy caps either a window (`windowAmount` per `windowUnit`: `hour`, `day`, `week`, `month` or `billing_period`) or a single draw (`maxPerDraw`), never both. Windows run on UTC: a week from Monday, a month from the 1st. `billing_period` follows the company's plan period and is for company caps only. A scope holds one window cap per period and one per-use cap per credit; a second answers 409. An edit cannot change a policy's credit, scope or kind. Window caps carry `consumed`, `headroom` and `resetsAt`; the policy names its `credit` and, for a member's cap, its `user`.

`deriveUsageControls(policies, balances, { credits?, locale })` turns the list into rows: the company first, then members by name, shorter windows before longer and per-use caps last. Each row has `limitText`, `consumedText`, `percent`, the credit's `unitName` for the cap, and a `status` of `ok`, `near` (80% spent) or `reached`. `creditOptions` lists the credits the company holds, which are the ones a new limit can cap. `takenCaps`, `windowUnitFor` and `nextReset` are what the dialog uses to offer only caps the API accepts and to preview when one resets.

## The styled element

```tsx
<UsageControls credits={["bcr_ai"]} allowEdit={isAdmin} />
```

| Prop                  | Default | Effect                                                             |
| --------------------- | ------- | ------------------------------------------------------------------ |
| `credits`             | —       | Credit ids whose limits to show and add; every credit when absent. |
| `allowEdit`           | `false` | Shows Add and Edit.                                                |
| `showHeader`          | `true`  | The "Usage limits" heading.                                        |
| `headingLevel`        | `2`     | The heading's level.                                               |
| `className`, `locale` | —       | Root class; BCP 47 tag for formatting.                             |
| `strings`             | —       | Copy for this element by key; wins over the provider's.            |

Each row names who the limit is for ("Everyone at Acme", or the member), its cap ("10,000 AI credits per billing period", "25 AI credits per use"), and when it resets, in the viewer's time. A window at 80% of its cap shows "Near limit · 44 of 50"; one used up shows "Limit reached · 50 of 50". Spend shows only inside those chips; rows under 80% show none. Limits in one credit name it once, beside the heading; limits across several name it on each row. With no limits the card says everyone shares the company balance.

With `allowEdit`, "Add a policy" below the list and each row's Edit open a dialog with who the limit is for, the credit, per period or per use, the period and the amount, and a line previewing it ("Up to 500 AI credits a month, resets Dec 1"). Monthly is the plan period for the whole company and the calendar month for a member. Periods a scope already has are disabled. Edit shows who, which credit and the kind as fixed text; to change them, remove the limit and add another. Remove asks once before it goes.

The member picker lists the people who have spent the credit, so someone who has not used it yet cannot be capped from here.

`allowEdit` only hides the controls: any session can call the write routes, so turn it on for the people your product lets manage limits. Changes made here are not yet attributed to a person in the audit log (SCH-8026).

The element renders nothing without a session, on a 403 or 404 (spend policies off), and when the company holds no credits and has no limits. Other failures show an error with a retry. It reads `spendPolicies`, `creditBalances` and `company`; the dialog reads `useCreditUserUsage` for its picker when it opens.

## Localizing it

The card's copy is under `usageControls*`: `usageControlsPer*` for caps, `usageControlsNearLimit` and `usageControlsLimitReached` for the chips (they take `used` and `limit`), `usageControlsPreview*` for the dialog's preview line, and `usageControlsDuplicateError` for a period the scope already has.
