# CreditBundles

The credit bundles the company's plan can buy, each with a button that opens checkout with that one bundle staged on the company's current plan.

## Hooks and derivation

`useCatalog({ catalogId? })` reads the catalog the company buys from (`GET /catalog/view`), and `useCompany()` reads the plan and subscription the bundles are judged against. Without a session the catalog is the public one, which sells nothing, so the element waits for a company catalog. A 403 or 404 means the account is not on the `multi-product-catalog` flag or has no catalog.

`deriveCreditBundles(catalog, company, { credits?, locale })` keeps the bundles checkout would offer the plan, in catalog order:

- The plan is the catalog's current plan, unless the company could start a trial on it, else the company's own (`bundlePlanId`). A company on no plan sees only bundles every plan may buy.
- The currency is the subscription's, else the catalog's first; a bundle with no price in it is left out.
- `credits` narrows to some credit ids.

Each row has the bundle's `credits` per purchase (`null` for one sold by the credit, priced per credit), `creditsText`, the credit's `unitName` for that count, `priceText`, `expiry` (`never`, `afterDays`, `afterPeriods` with a `count`, `periodEnd`, `nextPeriodEnd`, `trialEnd`, or `null` when unset) and the catalog `bundle` itself.

```tsx
import {
  deriveCreditBundles,
  useCatalog,
  useCheckoutLauncher,
  useCompany,
} from "@schematichq/schematic-components/elements";

function TopUp() {
  const catalog = useCatalog();
  const company = useCompany();
  const { open } = useCheckoutLauncher();
  if (catalog.data?.source !== "company") return null;

  const { rows } = deriveCreditBundles(catalog.data.catalog, company.data, {
    locale: "en-US",
  });
  return rows.map((row) => (
    <button
      key={row.id}
      onClick={() =>
        open({
          selection: { creditBundles: { [row.id]: 1 } },
          steps: {
            hideSkipped: true,
            initial: "credits",
            skip: ["plan", "autoTopup", "usage", "addOns", "addOnUsage"],
          },
        })
      }
    >
      {row.name} · {row.priceText}
    </button>
  ));
}
```

## The styled element

```tsx
<CheckoutLauncherProvider>
  <CreditBundles credits={["bcr_ai"]} />
</CheckoutLauncherProvider>
```

| Prop                  | Default | Effect                                                               |
| --------------------- | ------- | -------------------------------------------------------------------- |
| `credits`             | —       | Credit ids whose bundles to show; every credit when absent.          |
| `catalogId`           | —       | The catalog to read and buy from; the account's default when absent. |
| `onBuy`               | —       | Called with the bundle instead of opening the launcher's checkout.   |
| `showHeader`          | `true`  | The "Credit bundles" heading.                                        |
| `headingLevel`        | `2`     | The heading's level.                                                 |
| `className`, `locale` | —       | Root class; BCP 47 tag for formatting.                               |
| `strings`             | —       | Copy for this element by key; wins over the provider's.              |

Each row shows the bundle's name, its credits and when they expire ("500 AI credits · Never expire"), and a primary button showing its price ("$10.00"); a bundle sold by the credit reads "$0.02 per AI credit" and "Buy". With no bundle on offer the card says so and points to the account team.

The button opens the nearest `CheckoutLauncherProvider`'s checkout on the credits step with the bundle staged and every other step but checkout hidden. The cart keeps the current plan, so a paid plan's subscription takes the bundle with nothing else changed, and a company on no paid plan pays for the bundle alone. Without a provider the click only logs the launcher's development warning; pass `onBuy` to handle it yourself.

The element renders nothing without a session, on a 403 or 404 from the catalog, or when the catalog cannot sell through checkout. Other failures show an error with a retry.

A card that needs 3-D Secure cannot buy bundles yet: checkout's finalize answers 500 (SCH-7711).

## Localizing it

The card's copy is under `creditBundles*`: `creditBundlesExpire*` and `creditBundlesNeverExpire` for expiry, `creditBundlesBuyUnpriced` for the button of a bundle sold by the credit (a priced bundle's button shows only its price), and `creditBundlesBuyPriceLabel` / `creditBundlesBuyLabel` for its accessible name. `creditBundlesExpireAfterDays` and `creditBundlesExpireAfterPeriods` take `count` and plural forms.
