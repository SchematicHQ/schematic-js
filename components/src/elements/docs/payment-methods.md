# PaymentMethods

The company's payment method on file, laid out as the embed's `PaymentMethod` element is: a pill naming the default method, a warning beside the heading when that card is about to expire, and an Edit that opens a dialog where the other saved methods can be made the default or removed and a new one added through Stripe.

## Hook and derivation

`usePaymentMethods()` serves `GET /company/payment-methods`. It takes no parameters — a company has one list — and `data` is `PaymentMethod[]`, **empty when nothing is on file**: that is a 200 with an empty list, a loaded answer, so the element renders its empty state rather than a failure. A 404 means the list cannot be read — the account is not on the `company-context-api` flag, or the billing provider no longer knows the customer — and surfaces as an error, as it does for the invoice history.

The handle carries the writes beside the read: `setDefault(externalId)` and `remove(id)`, each a promise that refetches the list on success and rejects on failure, with `isMutating` true while one is on the wire and `mutationError` holding the last rejection. `setDefault` takes the provider's id (the `externalId`), because that is what the provider is asked with; `remove` takes Schematic's. `useSetupIntent().create()` mints a setup intent for a new method, which is what the Add form confirms through Stripe.

Four rules hold across the list, and the server applies them, not the element:

- The default cannot be removed while other methods exist; `canRemove` is false on it.
- The last method stays on an active subscription, so its `canRemove` is false too.
- A method added through the form becomes the default. The form asks for that itself, with `setDefault`, once Stripe confirms the setup.
- Nothing is promoted. A list with no default — which a provider allows — stays that way until someone chooses; the pill reads as empty and every method is offered in the dialog.

`derivePaymentMethods` turns the wire rows into what the element shows. It returns the `rows`, the `current` one — the default, which is what the pill shows, or `null` when none is — and the `others`, which is every row but the default (all of them when there is no default). Alongside sit `monthsToExpiration` and `expiryWarning` for the header: `soon` when the default card has fewer than four months left, `expired` once its month has arrived, `none` otherwise. The months are whole calendar months from the current month to the card's, as the embed counts them; `now` fixes the moment they are counted from, for a test or a server render.

Each row has a `kind` (`card`, `bank`, `wallet`, `other`), an `icon` (the glyph's name in the schematic-icons font, mapped as the embed maps it: `visa`, `mastercard`, or `amex` where the card's brand matches, `credit` for any other card, `bank` for a US bank account, the wallet's own mark — `applepay`, `google`, `cashapp`, `paypal`, `link`, `amazonpay` — and `generic-payment` for a type nobody mapped), the `last4` digits that follow its label, `expiresShort` ("8/27", the embed's form, for a card), its own `monthsToExpiration` and `expiry`, and a `label`. The label is either `{ key }` — copy to resolve through the translator, such as `paymentMethodsCardEndingIn` for "Card ending in" — or `{ text }`, a value the provider supplied: the bank's name, the email behind a Link account, the account name behind PayPal or Cash App. A wallet that supplied nothing is named by its own key, in the embed's words: "PayPal account", "CashApp account", "Link account", "Amazon Pay account", or "Apple Pay" and "Google Pay" when no card digits came with them. Only US bank accounts are banks, and only cards, Apple Pay, and Google Pay carry digits; any other type, a debit scheme included, is named by whatever the provider supplied. That split keeps the derivation pure and the translatable words in the string catalogue.

```tsx
import {
  derivePaymentMethods,
  usePaymentMethods,
} from "@schematichq/schematic-components/elements";

function CardOnFile() {
  const { data, setDefault } = usePaymentMethods();
  if (data === undefined) return <Spinner />;

  const { current, others, expiryWarning } = derivePaymentMethods(data, {
    locale: "en-US",
  });
  const name = (row: PaymentMethodRow) =>
    row.label.key !== undefined ? t(row.label.key) : row.label.text;
  return (
    <section>
      {expiryWarning === "expired" && <em>Expired</em>}
      <p>
        {current === null
          ? "No payment method added yet"
          : `${name(current)} ${current.last4 ?? ""}`}
      </p>
      <ul>
        {others.map((row) => (
          <li key={row.id}>
            {name(row)} {row.last4}
            <button onClick={() => setDefault(row.externalId)}>
              Set default
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Every row carries its raw fields beside the text — `brand`, `type`, `isDefault`, `canRemove` — so a host that wants different wording never has to abandon the derivation.

## The styled element

```tsx
<PaymentMethods allowEdit={false} />
```

| Prop                  | Default | Effect                                                             |
| --------------------- | ------- | ------------------------------------------------------------------ |
| `showHeader`          | `true`  | The "Payment Details" heading, and the expiry warning beside it.   |
| `showExpiration`      | `true`  | The warning when the default card has fewer than four months left. |
| `allowEdit`           | `true`  | The Edit (or Add) action on the pill, and the dialog behind it.    |
| `headingLevel`        | `2`     | The heading's level, to fit the host's outline.                    |
| `className`, `locale` | —       | Root class; BCP 47 tag for formatting and Stripe's UI.             |
| `strings`             | —       | Copy for this card by key; wins over the provider's.               |

`locale` falls back to the one configured on the provider, then to the
viewer's language; see [Localizing it](#localizing-it) for the copy.

The card is the embed's. The heading reads "Payment Details", and when the
default card has fewer than four months left the right of the header says
"Expires in 2 mo", or "Expired" once its month has arrived, in the
danger colour. Below it one pill names the default method the way the embed
does — "Card ending in 4444", "Apple Pay ending in 1881", the bank's name and
the account's digits, a Link account by its email — with Edit on the right,
or "No payment method added yet" with Add when nothing is on file. The pill
shows the default only; the other methods live in the dialog. It carries
`data-kind` and `data-brand` for a host that wants to style by either.

### Icons

Each method wears its brand's mark before the label — Visa, Mastercard,
Amex, a generic card, a bank, or the wallet's own — and the dialog's close
control and the chevron on "Choose different payment method" are glyphs of
the same set. The glyphs come from the schematic-icons font, which
`<SchematicStyles />` inlines, so nothing else has to be loaded. The class
contract is `schematic-icon schematic-icon--<name>`, with the row's `icon`
as the name; the method's mark also carries
`schematic-payment-methods__icon`. Every glyph is `aria-hidden`, and the
label stays beside it, so a host that blocks the font degrades to the text
rather than to nothing.

The font is a `data:` URL. A host whose Content Security Policy sets a
`font-src` directive needs `data:` in it, or the browser refuses the font
and the glyphs render empty.

The pill offers no Remove. The server refuses to remove the default while
other methods exist, and the last method on an active subscription, so a
Remove on the default would fail every time; removal is offered on the other
rows in the dialog, and only where the server's `canRemove` allows it.

Edit opens a modal dialog titled "Edit payment details", closed by Escape,
the backdrop, or the control in its header. It opens on the pill again,
without Edit, and beneath it "Choose different payment method" unfolds the
other methods: each row names the method, says when a card expires ("Expires
8/27"), and offers Set default and a remove control where the server allows
it. Under the rows a full-width "Add new payment method" opens the form. The
actions are disabled while a write is on the wire; a write that lands leaves
the dialog as it was, the rows still unfolded over the refreshed list, and
one that fails is reported at the foot of the dialog in the embed's words —
"Error updating payment method. Please try again." or "Error deleting
payment method. Please try again." — with "Try again", which re-runs it.

The form is loaded on first use, and the Stripe packages with it, so a page
that only shows the method on file never downloads Stripe. It mints a setup
intent, mounts Stripe's `PaymentElement` on it, and on Save confirms the
setup in place; the saved method is then made the default and the dialog
returns to it with the rows folded away. "Save payment method" waits until
Stripe calls the fields complete, and reads "Loading" while it saves.
"Select existing payment method" beneath the form goes back without saving.
With nothing on file the dialog opens straight onto the form, and the
dialog's close control is the way out. Stripe's own wording shows for a
declined card or an invalid field; any other failure reads "A problem
occurred while saving your payment method." A setup intent the API refused
reads "Error initializing payment method change. Please try again." A
missing client secret, a Stripe that fails to load, a host without the
Stripe packages installed, or fields that do not come up within ten seconds
read as the embed's "Unable to load payment form." message, which suggests
the browser's privacy settings may be blocking it.

Stripe's fields render in an iframe, where the host's CSS reaches nothing,
so the form hands Stripe an `appearance` resolved from the tokens: the body
font, the text, background, accent, and danger colours, and the radius, each
read as the browser resolves it under the host's `color-scheme`. A dark host
gets a form it can read.

A failure with a method still on screen — a refetch that did not land — is
reported under it rather than replacing it; only a failure with nothing to
show takes over the card. A 404 with nothing to show renders "Payment
methods are not available"; every other failure, and a 404 under a method
already loaded, reads "Could not load payment methods". Both offer "Try
again". Neither shows the error's own message; in development it is logged
to the console beside the copy.

## Localizing it

`locale` localizes the formatting and is handed to Stripe for the form's own
labels; the words come from `strings` or from the host's `translate`.
`strings={{ paymentMethodsHeader: "Billing" }}` renames the heading with no
i18n stack, and `translate={t}` routes every string through i18next.

The keys this element renders are `paymentMethodsHeader`,
`paymentMethodsLoading`, `paymentMethodsError`, `paymentMethodsUnavailable`,
`paymentMethodsEmpty`, `paymentMethodsEdit`, `paymentMethodsAdd`,
`paymentMethodsExpiresInMonths`, `paymentMethodsExpired`,
`paymentMethodsCardEndingIn`, `paymentMethodsApplePayEndingIn`,
`paymentMethodsGooglePayEndingIn`, `paymentMethodsApplePay`,
`paymentMethodsGooglePay`, `paymentMethodsAmazonPayAccount`,
`paymentMethodsCashAppAccount`, `paymentMethodsPayPalAccount`,
`paymentMethodsLinkAccount`, `paymentMethodsBankAccount`,
`paymentMethodsGeneric`, `paymentMethodsDialogTitle`, `paymentMethodsClose`,
`paymentMethodsChooseDifferent`, `paymentMethodsExpires`,
`paymentMethodsSetDefault`, `paymentMethodsRemove`, `paymentMethodsAddNew`,
`paymentMethodsSelectExisting`, `paymentMethodsFormLoading`,
`paymentMethodsFormError`, `paymentMethodsSetupError`, `paymentMethodsSave`,
`paymentMethodsSaving`, `paymentMethodsSaveError`,
`paymentMethodsSetDefaultError`, `paymentMethodsRemoveError`, and `retry`. `strings.test.ts` freezes the list, so a rename is a
deliberate, breaking change.

Two of them take values. `paymentMethodsExpires` interpolates `{{date}}`, the
embed's short form, and `paymentMethodsExpiresInMonths` interpolates
`{{months}}` into the embed's abbreviated "Expires in {{months}} mo", which
needs no plural forms.

The labels are not assembled from fragments: "Card ending in" is one string,
and the digits follow it in their own node, so a translator owns the words
and a host can style the digits.

## Markup

What the element renders, for a host styling it without `<SchematicStyles />`.
The root's class list is the same in all three states — read `data-state` to
tell them apart. The dialog renders inside the root while it is open.

```html
<div class="schematic-card schematic-payment-methods" data-state="ready">
  <!-- omitted by showHeader={false}, and the warning with it -->
  <div class="schematic-header">
    <h2 class="schematic-header__title">Payment Details</h2>
    <!-- when the default card has fewer than four months left;
         data-expiry is soon or expired -->
    <span
      class="schematic-small schematic-payment-methods__expiry-warning"
      data-expiry="soon"
      >Expires in 2 mo</span
    >
  </div>

  <div
    class="schematic-payment-methods__current"
    data-testid="schematic-payment-method-current"
  >
    <span
      class="schematic-payment-methods__method"
      data-kind="card"
      data-brand="visa"
    >
      <!-- the brand's mark; the name is the row's icon -->
      <i
        class="schematic-icon schematic-icon--visa schematic-payment-methods__icon"
        aria-hidden="true"
      ></i>
      <span class="schematic-payment-methods__label">Card ending in</span>
      <!-- omitted for a method with no digits -->
      <span class="schematic-payment-methods__last4">4444</span>
    </span>
    <!-- with nothing on file, in place of the method -->
    <span class="schematic-payment-methods__empty"
      >No payment method added yet</span
    >
    <!-- omitted by allowEdit={false}; reads Add when nothing is on file -->
    <button class="schematic-link-button schematic-payment-methods__edit">
      Edit
    </button>
  </div>

  <!-- while open -->
  <dialog
    class="schematic-dialog schematic-payment-methods__dialog"
    aria-labelledby="…"
    open
  >
    <div class="schematic-dialog__header">
      <h2 class="schematic-dialog__title" id="…">Edit payment details</h2>
      <button class="schematic-dialog__close" aria-label="Close">
        <i class="schematic-icon schematic-icon--close" aria-hidden="true"></i>
      </button>
    </div>
    <div class="schematic-dialog__body">
      <!-- the pill again, without Edit -->
      <div class="schematic-payment-methods__current">…</div>

      <button
        class="schematic-link-button schematic-payment-methods__choose"
        aria-expanded="true"
      >
        Choose different payment method
        <!-- chevron-down while folded -->
        <i
          class="schematic-icon schematic-icon--chevron-up schematic-payment-methods__chevron"
          aria-hidden="true"
        ></i>
      </button>

      <!-- while unfolded; the list is omitted when there are no others -->
      <ul class="schematic-payment-methods__list">
        <li
          class="schematic-payment-methods__row"
          data-kind="bank"
          data-brand="us_bank_account"
          data-testid="schematic-payment-method"
        >
          <span class="schematic-payment-methods__method" …>
            <i
              class="schematic-icon schematic-icon--bank schematic-payment-methods__icon"
              aria-hidden="true"
            ></i>
            <span class="schematic-payment-methods__label">Chase</span>
            <span class="schematic-payment-methods__last4">6789</span>
          </span>
          <!-- cards only -->
          <span
            class="schematic-muted schematic-small schematic-payment-methods__expires"
            >Expires 8/27</span
          >
          <button
            class="schematic-link-button schematic-payment-methods__set-default"
          >
            Set default
          </button>
          <!-- rows the server lets go -->
          <button class="schematic-payment-methods__remove" aria-label="Remove">
            <i
              class="schematic-icon schematic-icon--close"
              aria-hidden="true"
            ></i>
          </button>
        </li>
      </ul>
      <button class="schematic-cta schematic-payment-methods__add-new">
        Add new payment method
      </button>

      <!-- in place of everything above, on Add new or with nothing on file;
           its fields are Stripe's -->
      <form class="schematic-payment-methods__form" data-state="ready">
        <div class="schematic-payment-methods__fields">…</div>
        <!-- a save that failed, or fields that did not load -->
        <p
          class="schematic-error schematic-small schematic-payment-methods__form-error"
          role="alert"
        >
          …
        </p>
        <!-- disabled until Stripe calls the fields complete; "Loading"
             while it saves -->
        <button class="schematic-cta schematic-payment-methods__save">
          Save payment method
        </button>
        <!-- omitted with nothing on file -->
        <button
          class="schematic-link-button schematic-payment-methods__select-existing"
        >
          Select existing payment method
        </button>
      </form>
      <!-- or, when the setup intent or Stripe itself failed, the same error
           line and "Select existing payment method" in
           <div class="schematic-payment-methods__form" data-state="error"> -->

      <!-- a write that failed -->
      <p
        class="schematic-status-note schematic-error schematic-payment-methods__error"
        role="alert"
      >
        <span class="schematic-payment-methods__error-message">…</span>
        <button
          class="schematic-link-button schematic-payment-methods__error-retry"
        >
          Try again
        </button>
      </p>
    </div>
  </dialog>

  <!-- a refetch that failed with the method still on screen -->
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
      <div class="schematic-skeleton__cell" data-column="action"></div>
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
