# PaymentMethods

The company's saved payment methods: what each one is, which is the default, whether a card is about to expire, and the actions to change any of that — Make default, Remove, and Add, which opens a Stripe form.

## Hook and derivation

`usePaymentMethods()` serves `GET /company/payment-methods`. It takes no parameters — a company has one list — and `data` is `PaymentMethod[]`, **empty when nothing is on file**: that is a 200 with an empty list, a loaded answer, so the element renders its empty state rather than a failure. A 404 means the list cannot be read — the account is not on the `company-context-api` flag, or the billing provider no longer knows the customer — and surfaces as an error, as it does for the invoice history.

The handle carries the writes beside the read: `setDefault(externalId)` and `remove(id)`, each a promise that refetches the list on success and rejects on failure, with `isMutating` true while one is on the wire and `mutationError` holding the last rejection. `setDefault` takes the provider's id (the `externalId`), because that is what the provider is asked with; `remove` takes Schematic's. `useSetupIntent().create()` mints a setup intent for a new method, which is what the Add form confirms through Stripe.

Four rules hold across the list, and the server applies them, not the element:

- The default cannot be removed while other methods exist; `canRemove` is false on it.
- The last method stays on an active subscription, so its `canRemove` is false too.
- A method added through the form becomes the default. The form asks for that itself, with `setDefault`, once Stripe confirms the setup.
- Nothing is promoted. A list with no default — which a provider allows — stays that way until someone chooses; the element shows no badge and offers Make default on every row.

`derivePaymentMethods` turns the wire rows into display rows. Each has a `kind` (`card`, `bank`, `wallet`, `other`), a `label` ("Visa", "Chase", "Link · jo@example.com"), the `last4` digits that tell it from another of the same brand, and an `expiry`: `expired` once a card's last month has passed, `soon` when it ends within four months, `ok` otherwise, and `none` for anything that does not expire. `expiresText` is the month and year for the locale ("08/2027"), and `now` fixes the moment expiry is judged from, for a test or a server render.

```tsx
import {
  derivePaymentMethods,
  usePaymentMethods,
} from "@schematichq/schematic-components/elements";

function CardsOnFile() {
  const { data, setDefault, remove } = usePaymentMethods();
  if (data === undefined) return <Spinner />;

  const rows = derivePaymentMethods(data, { locale: "en-US" });
  return (
    <ul>
      {rows.map((row) => (
        <li key={row.id}>
          {row.label} {row.last4 !== null && `···· ${row.last4}`}
          {row.isDefault && <strong>Default</strong>}
          {row.expiry === "expired" && <em>Expired {row.expiresText}</em>}
          {!row.isDefault && (
            <button onClick={() => setDefault(row.externalId)}>
              Make default
            </button>
          )}
          {row.canRemove && (
            <button onClick={() => remove(row.id)}>Remove</button>
          )}
        </li>
      ))}
    </ul>
  );
}
```

Every row carries its raw fields beside the text — `brand`, `type`, `isDefault`, `canRemove` — so a host that wants different wording never has to abandon the derivation.

## The styled element

```tsx
<PaymentMethods allowRemove={false} />
```

| Prop                  | Default | Effect                                                 |
| --------------------- | ------- | ------------------------------------------------------ |
| `allowAdd`            | `true`  | The Add action and the Stripe form behind it.          |
| `allowRemove`         | `true`  | The Remove and Make default actions on each row.       |
| `showHeader`          | `true`  | The "Payment methods" heading.                         |
| `showExpiration`      | `true`  | A card's expiry beside it.                             |
| `headingLevel`        | `2`     | The heading's level, to fit the host's outline.        |
| `className`, `locale` | —       | Root class; BCP 47 tag for formatting and Stripe's UI. |
| `strings`             | —       | Copy for this card by key; wins over the provider's.   |

`locale` falls back to the one configured on the provider, then to the
viewer's language; see [Localizing it](#localizing-it) for the copy.

Each row names the method and its last four digits, wears the Default badge
when it is the default, and shows the card's expiry beside it — muted while
it is fine, in the warning colour when it ends within four months, in the
danger colour once it has. Make default appears on every row but the default;
Remove on every row the server allows it. The row's actions are disabled
while a write is on the wire, and a write that fails is reported beneath the
list with "Try again", which re-runs that write; the rows stay.

Add opens a form under the list. The form is loaded on that first click, and
the Stripe packages with it, so a page that only lists methods never
downloads Stripe. It mints a setup intent, mounts Stripe's `PaymentElement`
on it, and on Save confirms the setup in place; the saved method is then
made the default and the form closes. Stripe's own wording shows for a
declined card. A missing client secret, a Stripe that fails to load, or a
host without the Stripe packages installed each show "Could not load payment
methods" in place of the form, with Cancel as the way out.

A failure with rows still on screen — a refetch that did not land — is
reported under them rather than replacing them; only a failure with nothing
to show takes over the card. A 404 with nothing to show renders "Payment
methods are not available"; every other failure, and a 404 under rows
already loaded, reads "Could not load payment methods". Both offer "Try
again". Neither shows the error's own message; in development it is logged
to the console beside the copy.

## Localizing it

`locale` localizes the formatting and is handed to Stripe for the form's own
labels; the words come from `strings` or from the host's `translate`.
`strings={{ paymentMethodsHeader: "Cards on file" }}` renames the heading with
no i18n stack, and `translate={t}` routes every string through i18next.

The keys this element renders are `paymentMethodsHeader`,
`paymentMethodsLoading`, `paymentMethodsError`, `paymentMethodsUnavailable`,
`paymentMethodsEmpty`, `paymentMethodsAdd`, `paymentMethodsRemove`,
`paymentMethodsMakeDefault`, `paymentMethodsDefault`, `paymentMethodsLast4`,
`paymentMethodsExpires`, `paymentMethodsExpiresSoon`, `paymentMethodsExpired`,
`paymentMethodsFormLoading`, `paymentMethodsSave`, `paymentMethodsSaveError`,
`paymentMethodsCancel`, and `retry`. `strings.test.ts` freezes the list, so a
rename is a deliberate, breaking change.

Four of them take values: `paymentMethodsLast4` interpolates `{{last4}}`,
and `paymentMethodsExpires`, `paymentMethodsExpiresSoon`, and
`paymentMethodsExpired` interpolate `{{date}}`, already formatted for the
locale.

## Markup

What the element renders, for a host styling it without `<SchematicStyles />`.
The root's class list is the same in all three states — read `data-state` to
tell them apart.

```html
<div class="schematic-card schematic-payment-methods" data-state="ready">
  <!-- the bar is omitted when both the heading and Add are off -->
  <div class="schematic-header">
    <h2 class="schematic-header__title">Payment methods</h2>
    <button
      class="schematic-cta schematic-cta--small schematic-payment-methods__add"
    >
      Add
    </button>
  </div>

  <ul class="schematic-payment-methods__list">
    <li
      class="schematic-payment-methods__row"
      data-brand="visa"
      data-default="true"
      data-testid="schematic-payment-method"
    >
      <span class="schematic-payment-methods__method">
        <span class="schematic-payment-methods__brand">Visa</span>
        <!-- omitted for a method with no digits -->
        <span class="schematic-payment-methods__last4">···· 4242</span>
        <!-- the default row only -->
        <span class="schematic-badge schematic-payment-methods__default"
          >Default</span
        >
      </span>
      <!-- cards only; data-expiry is ok, soon, or expired -->
      <span
        class="schematic-small schematic-payment-methods__expires"
        data-expiry="ok"
        >Expires 08/2027</span
      >
      <!-- omitted when the row offers nothing -->
      <span class="schematic-payment-methods__actions">
        <!-- every row but the default -->
        <button
          class="schematic-link-button schematic-payment-methods__make-default"
        >
          Make default
        </button>
        <!-- rows the server lets go -->
        <button class="schematic-link-button schematic-payment-methods__remove">
          Remove
        </button>
      </span>
    </li>
  </ul>

  <!-- with nothing on file, in place of the list -->
  <p class="schematic-muted schematic-payment-methods__empty">
    No payment method on file
  </p>

  <!-- the Add form, once opened; its fields are Stripe's -->
  <form class="schematic-payment-methods__form" data-state="ready">
    <div class="schematic-payment-methods__fields">…</div>
    <div class="schematic-payment-methods__form-actions">
      <button
        class="schematic-cta schematic-cta--small schematic-payment-methods__save"
      >
        Save
      </button>
      <button class="schematic-link-button schematic-payment-methods__cancel">
        Cancel
      </button>
    </div>
  </form>

  <!-- a write that failed, with the rows still above it -->
  <p
    class="schematic-status-note schematic-error schematic-payment-methods__write-error"
    role="alert"
  >
    <span class="schematic-payment-methods__write-error-message">…</span>
    <button
      class="schematic-link-button schematic-payment-methods__write-retry"
    >
      Try again
    </button>
  </p>

  <!-- a refetch that failed with rows still on screen -->
  <p class="schematic-status-note schematic-error">…</p>
</div>

<div
  class="schematic-card schematic-payment-methods"
  data-state="pending"
  aria-busy="true"
>
  <span class="schematic-hidden">Loading payment methods</span>
  <div class="schematic-skeleton">
    <div class="schematic-skeleton__heading"></div>
    <div class="schematic-skeleton__row">
      <div class="schematic-skeleton__cell" data-column="method"></div>
      <div class="schematic-skeleton__cell" data-column="actions"></div>
    </div>
    <div class="schematic-skeleton__row">
      <div class="schematic-skeleton__cell" data-column="method"></div>
      <div class="schematic-skeleton__cell" data-column="actions"></div>
    </div>
  </div>
</div>

<div class="schematic-card schematic-payment-methods" data-state="error">
  <div class="schematic-status">
    <span class="schematic-error schematic-status__message">
      Could not load payment methods
    </span>
    <button class="schematic-link-button schematic-status__retry">
      Try again
    </button>
  </div>
</div>
```

`elements/markup.test.tsx` freezes this contract.
