# UpcomingBill

The company's next bill: what it will be charged and when, with the account balance and discounts that shaped the figure.

## Hook and derivation

`useUpcomingInvoice()` serves `GET /company/upcoming-invoice`. It takes no parameters — a company has one next bill — and `data` is `UpcomingInvoice | null`, where **`null` means there is nothing to bill**: no subscription, or one that is ending. That is a loaded answer, so `isPending` is false and there is no error; only `data === undefined` means the resource has not loaded. The endpoint reports it as a 404 and the client turns it into the `null`, which is also what an account not yet on the `company-context-api` flag sees.

`deriveUpcomingInvoice` formats the parts. The arithmetic is not in it: the server sends how much balance the invoice consumes and how much survives, because those depend on billing-provider conventions no consumer should have to know. The derivation signs the applied balance (it comes off the bill) and formats each amount for the locale.

```tsx
import {
  deriveUpcomingInvoice,
  useUpcomingInvoice,
} from "@schematichq/schematic-components/v3";

function NextBill() {
  const { data: invoice } = useUpcomingInvoice();
  if (invoice === undefined) return <Spinner />;
  if (invoice === null) return <p>No upcoming invoice</p>;

  const bill = deriveUpcomingInvoice(invoice, { locale: "en-US" });
  return (
    <section>
      <h2>{bill.dueAt === null ? "Next bill" : `Due ${bill.dueAt.text}`}</h2>
      <p>{bill.amountDueText}</p>
      {bill.balanceApplied !== null && (
        <p>Applied balance {bill.balanceApplied.amountText}</p>
      )}
      {bill.discounts.map((d, i) => (
        <p key={`${d.couponName}-${i}`}>
          {d.code ?? d.couponName}: {d.valueText} off
        </p>
      ))}
    </section>
  );
}
```

Every line carries its raw value beside the text — `amountDueMinor`, `percentOff`, `dueAt.date` — so a host that wants different wording never has to abandon the derivation. `format` overrides one field at a time: `format: { amount: (minor, currency) => … }` receives the **signed** amount, which is how a deduction reads differently from a charge.

## The styled element

```tsx
<UpcomingBill showDiscounts={false} />
```

| Prop                  | Default | Effect                                               |
| --------------------- | ------- | ---------------------------------------------------- |
| `showHeader`          | `true`  | The "Next bill due …" heading.                       |
| `showAmount`          | `true`  | The estimated amount.                                |
| `showBalance`         | `true`  | The applied and remaining balance rows.              |
| `showDiscounts`       | `true`  | A row per active discount.                           |
| `headingLevel`        | `2`     | The heading's level, to fit the host's outline.      |
| `className`, `locale` | —       | Root class; BCP 47 tag for formatting.               |
| `strings`             | —       | Copy for this card by key; wins over the provider's. |

`locale` falls back to the one configured on the provider, then to the
viewer's language; see [Localizing it](#localizing-it) for the copy.

The balance rows appear together: a company that spends its whole balance on
this invoice still sees a remaining row, reading zero, because "your credit
is now gone" is worth saying. A company that never had a balance sees
neither. A failure with a bill still on screen is reported under it rather
than replacing it.

## Localizing it

`locale` localizes the formatting; the words come from `strings` or from the
host's `translate`. [localization.md](./localization.md) is the full
reference.

The keys this element renders are `upcomingBillHeader`,
`upcomingBillHeaderUndated`, `upcomingBillLoading`, `upcomingBillEstimate`,
`upcomingBillEmpty`, `upcomingBillBalanceApplied`,
`upcomingBillBalanceRemaining`, `upcomingBillDiscount`,
`upcomingBillDiscountValue`, `upcomingBillDiscountRepeating`, and `retry`.

Two of them take values. `upcomingBillHeader` interpolates `{{date}}`, and
`upcomingBillDiscountRepeating` interpolates `{{value}}` and varies by
`{{count}}` — so its catalogue entries are the suffixed
`upcomingBillDiscountRepeating_one` and `_other`, i18next's convention, while
the element asks for the bare name. A host's `translate` receives the same
`count`, so its own catalogue picks the form for languages English has no
category for.

Nothing is assembled from fragments: "20% off for 3 months" is one string
with two placeholders, so a translator owns the word order.

## Markup

What the element renders, for a host styling it without `<SchematicStyles />`.
The root's class list is the same in all three states — read `data-state` to
tell them apart.

```html
<div class="schematic-card schematic-upcoming-bill" data-state="ready">
  <div class="schematic-header">
    <h2 class="schematic-header__title">Next bill due September 15, 2026</h2>
  </div>

  <div class="schematic-upcoming-bill__amount">
    <span
      class="schematic-upcoming-bill__total"
      data-testid="schematic-upcoming-total"
      >$68.00</span
    >
    <span
      class="schematic-muted schematic-small schematic-upcoming-bill__estimate"
      >Estimated bill</span
    >
  </div>

  <!-- omitted when there is no balance and no discount -->
  <div class="schematic-upcoming-bill__rows">
    <div
      class="schematic-row schematic-upcoming-bill__balance-applied"
      data-testid="schematic-balance-applied"
    >
      <span class="schematic-row__label"
        >Applied balance towards next invoice</span
      ><span class="schematic-row__value">-$15.00</span>
    </div>
    <div
      class="schematic-row schematic-upcoming-bill__balance-remaining"
      data-testid="schematic-balance-remaining"
    >
      <span class="schematic-row__label"
        >Remaining balance after next invoice</span
      ><span class="schematic-row__value">$0.00</span>
    </div>
    <div
      class="schematic-row schematic-upcoming-bill__discount-row"
      data-testid="schematic-discount"
    >
      <span class="schematic-row__label">Discount</span>
      <span class="schematic-row__value schematic-upcoming-bill__discount">
        <!--
          The promo code; a coupon carrying none names itself instead, in
          <span class="schematic-muted schematic-upcoming-bill__coupon">.
        -->
        <span class="schematic-chip schematic-upcoming-bill__code"
          >LAUNCH20</span
        >
        <span class="schematic-upcoming-bill__discount-value"
          >20% off for 3 months</span
        >
      </span>
    </div>
  </div>

  <!-- with nothing to bill, in place of everything above -->
  <p class="schematic-muted schematic-upcoming-bill__empty">
    No upcoming invoice
  </p>

  <!-- a failure with the bill still on screen -->
  <p class="schematic-status-note schematic-error">…</p>
</div>

<div
  class="schematic-card schematic-upcoming-bill"
  data-state="pending"
  role="status"
  aria-busy="true"
  aria-label="Loading your next bill"
>
  <div class="schematic-skeleton">
    <div class="schematic-skeleton__heading"></div>
    <div class="schematic-skeleton__row">
      <div class="schematic-skeleton__cell" data-column="amount"></div>
    </div>
    <div class="schematic-skeleton__row">
      <div class="schematic-skeleton__cell" data-column="row"></div>
    </div>
  </div>
</div>

<div class="schematic-card schematic-upcoming-bill" data-state="error">
  <div class="schematic-status">
    <span class="schematic-error schematic-status__message">…</span>
    <button class="schematic-link-button schematic-status__retry">Retry</button>
  </div>
</div>
```

`elements/markup.test.tsx` freezes this contract.
