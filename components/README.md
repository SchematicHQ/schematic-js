# schematic-components

`schematic-components` provides client-side React components for customer portals, checkouts, and more using [Schematic](https://schematichq.com). It can be used in combination with [schematic-react](https://github.com/schematichq/schematic-js/tree/main/react), or on its own.

## Install

```bash
npm install @schematichq/schematic-components
# or
yarn add @schematichq/schematic-components
# or
pnpm add @schematichq/schematic-components
```

## Usage

Import components and functions and compose them into your project.

```js
import { EmbedProvider, SchematicEmbed, useEmbed } from '@schematichq/schematic-components';
```

See the [Schematic documentation](https://docs.schematichq.com/components/set-up) for a full guide on how to set up and use Schematic components.

## Advanced Checkout Usage

We provide a function `initializeWithPlan` as an alternate entrypoint into a
checkout flow. It's suitable for click handlers, and must be extracted from
the library's embedded context.

```ts
const { initializeWithPlan } = useEmbed();
```

This function allows developers to create their own button that

* Pre-selects a Plan
* Pre-selects add-ons (if available)
* Skips and hides plan selection stages

The `initializeWithPlan` function can be called with a Schematic plan ID, or
with a more powerful `BypassConfig` object.

Providing a plan ID as a string will preselect that plan and skip the plan
selection stage.

```ts
initializeWithPlan('plan_VBXv4bHjSf3');
```

Passing a config object allows pre-selecting add-ons and pay-in-advance
quantities, as well as hiding specific stages.

```ts
const config = {
  planId: 'plan_VBXv4bHjSf3',      // pre-select a Plan
  addOnIds: ['plan_AWv7bPjSx2'],   // pre-select 1 or more add-ons
  period: 'month',                 // pre-select 'month' or 'year' for the billing period (optional)
  payInAdvanceQuantities: {        // pre-fill pay-in-advance quantities, keyed by feature id (optional)
    feat_cns2asuKAG2: 3,           // "feat_cns2asuKAG2" is a feature id, 3 is the quantity
  },
  promoCode: 'SUMMER20',           // pre-apply a Stripe promotion code (optional)
  showBillingDisclaimer: false,    // if false, hide the recurring billing disclaimer (optional)
  skipped: {
    planStage: true,               // if true, skip Plan selection
    addOnStage: true,              // if true, skip Add-on selection
    usageStage: true,              // if true, skip the pay-in-advance Quantity stage
    addOnUsageStage: true,         // if true, skip the add-on Quantity stage
  },
  hideSkipped: true,               // if true, hide skipped stages from breadcrumb navigation
};

initializeWithPlan(config);
```

`payInAdvanceQuantities` only applies to entitlements with pay-in-advance
pricing; entries for other (or unknown) features are ignored. Combine it with
`skipped.usageStage` / `skipped.addOnUsageStage` to send the customer straight to
the final checkout step with the quantities already set.

`promoCode` pre-applies a discount to the checkout. It expects a Stripe
[promotion code](https://docs.stripe.com/billing/subscriptions/coupons) — the
customer-facing code such as `SUMMER20`, not the underlying coupon id. The
discount is applied on load, so the previewed charges reflect it and it ships
with the final checkout request.

`showBillingDisclaimer` controls the fine print under the checkout totals, e.g.
"You will be billed $50.00 for this subscription every month on the 17th unless
you unsubscribe." It is shown by default; set it to `false` when your own UI
states the billing terms. Hiding it does not affect the scheduled-downgrade
notice that appears in the same spot.

The Plans and add-ons available to the checkout flows must be live in your
Schematic account [Catalog configuration](https://docs.schematichq.com/catalog/overview).

To offer an add-on that isn't live, see
[Rehydrating With Params](#rehydrating-with-params).

## Rehydrating With Params

We provide a function `rehydrateWithParams` for re-fetching the embed's data
with params the standard load doesn't send. Like `initializeWithPlan`, it's
suitable for click handlers and must be extracted from the library's embedded
context.

```ts
const { rehydrateWithParams } = useEmbed();

const data = await rehydrateWithParams({ includeAddOnIds: ['plan_BQx8kWjSx4'] });
```

It re-fetches the component your `SchematicEmbed` loaded and applies the
result in place:

- The embed's data updates without the embed showing its loading state.
- It isn't debounced: every call makes a request, and the promise resolves
  with the new data once it's applied.
- The promise rejects if the request fails, leaving the embed's data and
  error state as they were, so your UI decides how to handle it. It also
  rejects if no `SchematicEmbed` has loaded yet.
- The params apply to this fetch only. The embed's next refresh, such as the
  one after a purchase, goes back to the standard load.

Await it before anything that depends on the new data, such as opening a
checkout with `initializeWithPlan`.

### Params

| Param             | Type       | Effect                                                                                                                                                               |
| ----------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `includeAddOnIds` | `string[]` | Add-ons to offer in the checkout even though they aren't live. Each must be an add-on with a billing product; any other ID is left out, with a console warning. |

### Example: selling an add-on that isn't live

Say your backend creates an add-on for a single purchase, such as a one-off
service, and deletes it afterward, so it's never live in your catalog. A "Buy
now" button can create it, include it, and open the checkout with it
selected:

```tsx
import { useState } from 'react';
import { useEmbed } from '@schematichq/schematic-components';

function BuyServiceButton({ serviceId }: { serviceId: string }) {
  const { rehydrateWithParams, initializeWithPlan } = useEmbed();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleClick = async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      // Your backend creates the add-on and returns its Schematic ID
      const { addOnId } = await createServiceAddOn(serviceId);

      // Fetch the embed's data again, this time with the add-on in it
      await rehydrateWithParams({ includeAddOnIds: [addOnId] });

      // Open the checkout. Including an add-on only makes it available;
      // list it in `addOnIds` to pre-select it.
      initializeWithPlan({
        addOnIds: [addOnId],
        skipped: { addOnStage: true }, // it's already chosen
      });
    } catch {
      setError("We couldn't start the checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Preparing checkout…' : 'Buy now'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
```

The add-on still has to be compatible with the selected plan and priced in
the checkout's currency and billing period to appear.

## Programmatic Unsubscribe

We provide a function `requestUnsubscribe` for starting the unsubscribe flow
from your own UI, without using the built-in `UnsubscribeButton`. Like
`initializeWithPlan`, it's suitable for click handlers and must be extracted
from the library's embedded context.

```ts
const { requestUnsubscribe } = useEmbed();
```

This lets developers create their own button — for example, a custom
"are you sure?" retention flow — that hands off to the same unsubscribe
experience the built-in component uses.

```ts
requestUnsubscribe();
```

The function takes no arguments. If there is no active subscription to cancel,
the request is ignored and a warning is logged to the console.

The unsubscribe flow is rendered by the embed itself, so a Schematic embed (the
`Viewport` that hosts it) must be mounted on the page where you call
`requestUnsubscribe`. This is the same requirement as `initializeWithPlan`.

## Localization

The components render in English by default. `EmbedProvider` takes three props
to change that:

```tsx
<EmbedProvider
  accessToken={accessToken}
  i18n={i18next}
  translations={{ it: schematicIt }}
  locale="it-IT"
>
```

- `locale` is a BCP 47 tag. It picks the language the components read from and
  formats every number, currency, and date. Without it, the components use the
  `i18n` instance's current language, else `en-US`.
- `i18n` is your own i18next instance, v21 or later. The components read their
  strings from its `schematic` namespace in its current language, and re-render
  when you call `changeLanguage`. Nothing is fetched from your backend: the
  components look keys up and fall back to English for any they do not find.
- `translations` is a map of language to bundle, for an app without i18next. Any
  key a bundle leaves out falls back to English.

Keys are the English strings themselves, and the English bundle is exported as
`schematicTranslationsEn` to translate from. The `SchematicTranslations` type
checks a bundle's keys. A plural takes i18next's suffixes, looked up by the bare
key and a `count`:

```ts
import type { SchematicTranslations } from '@schematichq/schematic-components';

export const schematicIt: SchematicTranslations = {
  'Cancel subscription': 'Annulla abbonamento',
  'Discount for months_one': '{{discount}} per il prossimo mese',
  'Discount for months_other': '{{discount}} per i prossimi {{count, number}} mesi',
};
```

With an `i18n` instance, register the same bundle under the `schematic`
namespace:

```ts
i18next.addResourceBundle('it', 'schematic', schematicIt);
```

Passing both `i18n` and `translations` is unusual. If you do, the instance
answers first, including through its own `fallbackLng`, so a key its English
bundle has is never read from `translations`.

Numbers interpolated into a string are formatted for the locale before they
reach it, so `{{amount}}` reads `20,000` or `20.000` on its own. A plural's
`count` is the exception: it stays a number so i18next can pick the form, and
the bundle formats it with `{{count, number}}`.

Feature names and their plural forms come from your Schematic account, not the
bundle, so set them there in the language you need. In a language other than
English, a name with no plural form set is shown as entered for every count,
rather than with an English plural ending added.

## License

MIT

## Support

Need help? Please open a GitHub issue or reach out to [support@schematichq.com](mailto:support@schematichq.com) and we'll be happy to assist.
