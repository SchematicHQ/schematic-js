# Checkout

A purchase in a dialog: the plan and its billing period and currency, automatic top-ups, pay-in-advance quantities, add-ons and their quantities, credit bundles, then payment. The customer chooses; the server prices every change and says what is wrong with the cart; the dialog decides only the order the choices are asked in.

```tsx
import {
  Checkout,
  SchematicStyles,
} from "@schematichq/schematic-components/elements";

function Upgrade() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SchematicStyles />
      <button onClick={() => setOpen(true)}>Upgrade</button>
      <Checkout
        open={open}
        onOpenChange={setOpen}
        selection={{ planId: "plan_pro", period: "year" }}
        steps={{ skip: ["plan"] }}
        onComplete={(result) => console.log("subscribed", result.status)}
      />
    </>
  );
}
```

Nothing loads while the dialog is closed, and every opening starts a new cart from `selection` and what the company has now.

## Opening it from anywhere

`CheckoutLauncherProvider` renders one `<Checkout />`, and `useCheckoutLauncher()` below it opens it, so a plan card, an over-limit prompt or a "buy more" link can start a purchase without holding the dialog's state:

```tsx
<CheckoutLauncherProvider defaults={{ steps: { hideSkipped: true } }}>
  <PlanCards />
</CheckoutLauncherProvider>;

function PlanCard({ plan }: { plan: CatalogPlan }) {
  const { open } = useCheckoutLauncher();
  return (
    <button onClick={() => open({ selection: { planId: plan.id } })}>
      Choose {plan.name}
    </button>
  );
}
```

`open(config)` lays each section of `config` over the same section of `defaults`.

## Configuring it

The props replace the embed's `initializeWithPlan(BypassConfig)`. They are read when the dialog opens; the customer edits from there, so an inline object is fine.

| `BypassConfig` (embed)                          | `<Checkout />`                                                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `planId`                                        | `selection.planId` (`null` for no plan)                                                                  |
| `period`                                        | `selection.period` (`"month"`, `"quarter"`, `"year"`)                                                    |
| `addOnIds`                                      | `selection.addOnIds`                                                                                     |
| `payInAdvanceQuantities`                        | `selection.quantities`, by feature id                                                                    |
| `promoCode`                                     | `selection.promoCode`                                                                                    |
| `startTrialIfAvailable`                         | `selection.trial` (default true)                                                                         |
| `currency`                                      | `selection.currency`                                                                                     |
| `skipped.planStage` … `addOnUsageStage`         | `steps.skip: ["plan", "addOns", "credits", "usage", "addOnUsage"]`                                       |
| `hideSkipped`                                   | `steps.hideSkipped`                                                                                      |
| `showCurrencySelector`, `showBillingDisclaimer` | `display.*`                                                                                              |
| provider `currencyFilter`                       | `display.currencies`                                                                                     |
| hydrate `showPeriodToggle`                      | `display.showPeriodToggle`                                                                               |
| provider `checkoutPrefill`                      | `checkoutPrefill`                                                                                        |
| `initializeWithPlan("plan_x")`                  | `selection={{ planId: "plan_x" }} steps={{ skip: ["plan"] }}`                                            |
| —                                               | `selection.creditBundles`, `selection.autoTopup`, `selection.customFields`, `steps.initial`, `catalogId` |
| —                                               | `display.layout`, `display.summary`                                                                      |

Left out, `selection.planId` is the company's current plan, unless the company could start a trial on it, when it chooses. `selection.addOnIds` is the add-ons it holds, `selection.quantities` what it has now, `selection.period` the subscription's. A subscription fixes the currency: a change keeps it, whatever `selection.currency` says.

What checkout collects — a tax ID, custom fields, an address, email or phone beside the card — and whether bundles are bought one at a time come from the catalog's checkout settings, not props.

## Layout

From 768px up the steps take the left and the summary — the lines, the totals and the action — the right, each scrolling on its own; below that the summary sits under the steps and the whole dialog scrolls. Two props change that, for a sheet that cannot:

- `display.layout: "stacked"` keeps the summary under the steps at every width. The root carries `schematic-checkout--stacked`, so a bottom sheet on a phone and a narrow card on a desktop are the same stylesheet.
- `display.summary: "payment"` shows the summary on the payment step alone. The steps before it carry their Next action in `.schematic-checkout__nav`, and the layout carries `data-summary="payment"`, so a wizard of one choice per screen asks nothing of the stylesheet but the column.

Everything else is CSS. The class names below are API, every step and card carries a `data-*` for its state, and a stylesheet rendered after `<SchematicStyles />` wins at equal specificity, so a host restyles the dialog without a prop for each part.

## The steps

The API has no steps. The dialog derives them from the catalog and the cart, in this order, each only when there is something to choose in it:

1. **Plan** — whenever the catalog sells plans; with the period toggle and currency choice.
2. **Auto top-up** — the plan has included credits whose top-up the company may set itself.
3. **Quantity** — the plan has pay-in-advance entitlements.
4. **Add-ons** — some add-on can be sold with the plan, and no trial is starting.
5. **Add-on quantity** — a chosen add-on has pay-in-advance entitlements.
6. **Credits** — some bundle is sold with the plan in the cart's currency.
7. **Checkout** — always: the payment method, promo code, tax ID, custom fields and the agreement.

A trial that needs no card goes from the plan (and its top-ups) to checkout. With no plan and some bundles the purchase is credits alone.

`steps.skip` passes over those steps, except a plan step with no plan to fall back on and any step a blocking problem points at: a refused finalize takes the customer to the first step that can fix it. Skipped steps stay in the step list, where choosing one returns to it, unless `steps.hideSkipped`.

## Hooks, for building your own

The element is built on these hooks from `@schematichq/schematic-react`, re-exported here:

- `useCatalog({ catalogId? })` — `GET /catalog/view`: plans, add-ons and bundles with the company's standing against each (`current`, `valid`, `invalidReason`, `companyCanTrial`), the checkout settings, `autoTopups` on each plan and `capabilities.checkout`.
- `useCompany()` — `GET /company`: the plan and add-ons held, and the subscription's currency and period.
- `useCheckout()` — the persisted cart: `setSelections(cart)` prices it, folding rapid calls into the newest, and `finalize()` charges it under the session the last price handed out, so a double submit is a 409 rather than a second charge. `problems` is the server's list; `snapshot` its last price.
- `useTaxIds()` — the tax IDs on file, with `update(taxId)`.

`deriveCheckout` turns the catalog, cart and checkout into what the element shows, and `checkoutSelections` turns the cart into what the API reads. `initialCart` and `cartReducer` are the cart itself.

## Problems

Everything the server finds wrong arrives as a `CheckoutProblem` with a `code`, whether it is `blocking`, and the ids of what it is about. The element shows the server's `message`; `formatProblem` substitutes your own words, by code:

```tsx
<Checkout
  formatProblem={(problem) =>
    problem.code === "payment_method_required" ? "Add a card first." : undefined
  }
/>
```

`onProblems` reports each new list.

## Payment

A new card goes through Stripe's Payment Element on a setup intent, so the checkout step needs `@stripe/stripe-js` and `@stripe/react-stripe-js`, the same peers as `PaymentMethods`. A card saved there pays for this checkout and joins the company's methods on file. When the charge needs the customer — 3-D Secure — the finalize answers with a client secret and the element confirms it with Stripe before `onComplete`.

The tax ID is not part of the cart: it saves on its own, when the field is left and again before a finalize.

## Before it can load

`GET /catalog/view` is gated on the `multi-product-catalog` flag and the `/company` reads on `company-context-api`. Without the first the dialog says checkout is not available; without the second it still sells, without the currency lock or current quantities. A catalog whose `capabilities.checkout` is false — no Stripe integration, more than one subscription, or one managed elsewhere — says checkout is not available too.

## Not yet

Tiered prices are shown at their flat unit price, not broken out by tier. A checkout cannot be resumed across a reload from the element (`useCheckout({ checkoutId })` can). Billing address, email and phone go to Stripe with the card rather than onto the cart.

## Markup

The root is `schematic-dialog schematic-checkout`, with `schematic-checkout--stacked` under `display.layout: "stacked"`. `.schematic-checkout__layout` carries `data-step` with the step on screen and `data-summary="payment"` when the summary is held for it. Step links carry `aria-current="step"`, `data-state` (`done`, `current`, `upcoming`) and `data-skipped`; plan and add-on cards `data-selected` and `data-valid`; problems `data-code`. The class names are pinned by `markup.test.tsx` and are API.

| Class                                                                                 | Where                                                                                                 |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `schematic-checkout__frame`                                                           | The status frame inside the dialog body; `data-state` is `pending`, `error` or `ready`.               |
| `schematic-checkout__unavailable`                                                     | The notice shown when the catalog cannot be bought from.                                              |
| `schematic-checkout__layout`                                                          | The steps and the summary; a grid of one column, two from 768px up.                                   |
| `schematic-checkout__main`                                                            | The left column: stepper, heading, the step on screen, its problems and navigation.                   |
| `schematic-checkout__stepper`, `__step`, `__step-link`                                | The step list, one `li` per visible step, the link within it.                                         |
| `schematic-checkout__heading`                                                         | The step's title.                                                                                     |
| `schematic-checkout__section`, `__section-title`                                      | A group within a step, with `data-step`; the payment step's promo code, tax ID, fields and agreement. |
| `schematic-checkout__controls`                                                        | The period toggle and currency choice above the plan cards.                                           |
| `schematic-checkout__cards`, `__card`, `__card-name`, `__card-price`, `__card-period` | Plan and add-on cards; `data-selected`, `data-valid`.                                                 |
| `schematic-checkout__card-description`, `__card-badges`                               | A card's description and its trial, current and invalid badges.                                       |
| `schematic-checkout__rows`, `__row`, `__row-name`, `__row-detail`, `__row-amount`     | Quantity, bundle and auto top-up rows.                                                                |
| `schematic-checkout__input`, `__input--quantity`                                      | Text and number inputs; the quantity modifier narrows them.                                           |
| `schematic-checkout__field`, `__field-label`, `__field-helper`, `__inline`            | A labelled control, its helper, and a row of them.                                                    |
| `schematic-checkout__check`, `__opt-in-text`                                          | The agreement checkbox and its text.                                                                  |
| `schematic-checkout__problems`                                                        | The problems on a step, each a `schematic-notice` with `data-code`.                                   |
| `schematic-checkout__nav`                                                             | Back, and Next while the summary is held.                                                             |
| `schematic-checkout__summary`, `__summary-title`                                      | The right column, an `aside` with `aria-busy` while pricing.                                          |
| `schematic-checkout__lines`, `__line`, `__line-amount`                                | What the cart holds, one line each.                                                                   |
| `schematic-checkout__totals`, `__total`, `__total--due`, `__total-amount`             | Proration, discount, tax, the period's total and the amount due now.                                  |
| `schematic-checkout__disclaimer`                                                      | The renewal, trial-end and scheduled-change lines under the totals.                                   |

The summary's action and the cards' choices are `schematic-cta`; the Back link is `schematic-link-button`; the payment step's card on file and form carry the `schematic-payment-methods__*` classes of `PaymentMethods`.
