# Elements

`@schematichq/schematic-components/elements` — code-first React elements on
the billing API. Each element reads one or two resources through hooks from
`@schematichq/schematic-react`, reduces them to a domain model with a pure
derivation, and renders with CSS-variable styling.

The rest of the elements land with the endpoints that feed them.

Naming: `billing` is the end-customer API tier that the elements read from
(`SchematicBillingClient`, `BillingProvider`, `fetchBillingData`); `catalog`
is reserved for the offerings resource. The routes those clients call are
still `/company/*`, and the generated wire models keep their `Company…`
names — the tier is what `billing` names, not the resource.

| Element        | Hooks                                 | Derivation              | Reads             | Recipe                                     |
| -------------- | ------------------------------------- | ----------------------- | ----------------- | ------------------------------------------ |
| Invoices       | `useInvoices`                         | `deriveInvoiceList`     | `invoices`        | [invoices.md](./invoices.md)               |
| UpcomingBill   | `useUpcomingInvoice`                  | `deriveUpcomingInvoice` | `upcomingInvoice` | [upcoming-bill.md](./upcoming-bill.md)     |
| PaymentMethods | `usePaymentMethods`, `useSetupIntent` | `derivePaymentMethods`  | `paymentMethods`  | [payment-methods.md](./payment-methods.md) |

## Before it can load

The company endpoints are gated on the `company-context-api` flag, per
account. An account without it gets a 404 from every `/company/*` read, and
because a 404 is not an answer the elements report it as "not available"
rather than showing a company with invoices, or a subscription, an empty
card.

The endpoints follow one rule the elements rely on. A collection with
nothing in it is a 200 with an empty list (`/company/invoices`). A single
resource that can legitimately be absent is a 204 (`/company/upcoming-invoice`
for a company with nothing to bill), which the client reads as `null` — a
loaded value, so the element renders its empty state. A 404 means the caller
cannot read the resource: the account is off the flag, the token does not
resolve, or the billing provider no longer knows the customer. A 404 never
means "nothing here", so the elements render "not available" for it and key
on the status alone, never on the error message. If a correctly configured page shows
`… failed with status 404`, the flag is what to check first. Ask Schematic
to turn it on for the account.

Adding a payment method goes through Stripe, so `PaymentMethods`' Add form
needs `@stripe/stripe-js` and `@stripe/react-stripe-js` installed beside the
package. Both are optional peers: the elements bundle leaves them out and
imports them on the first Add, so a page that only lists methods never loads
Stripe, and a host without them still lists — the form reports that it could
not load rather than crashing.

## Setup

```tsx
import { SchematicProvider } from "@schematichq/schematic-react";
import {
  Invoices,
  SchematicStyles,
} from "@schematichq/schematic-components/elements";

<SchematicProvider
  publishableKey="pk_…"
  session={{ company: company.id, token: fetchAccessToken }}
>
  <SchematicStyles />
  <Invoices />
</SchematicProvider>;
```

Copy and formatting are the host's. `locale` on the provider formats every
element through `Intl`, and each string resolves through `strings` on the
element, then `strings` on the provider, then `translate` (the host's own
`t`), then the element's English — so nothing has to be configured, and
renaming one string is one prop.

## The session

`session` says whose billing is being read and how. It has three states, and
they mean different things:

```tsx
session={{ company: company.id, token: fetchAccessToken }}  // signed in
session={null}                                              // signed out
session={undefined}                                         // still finding out
```

The identity is the `(company, user)` pair, because that is what a token is
minted for: the same person reads one company's billing and then another's,
and the same company is read by several people. `company` is your id for the
company, whatever names it in your own system. `user` is optional — leave it
out where your tokens are company-wide, and every reader of that company
shares one session; state it where you mint per person, and omitting it
later is a different session, not the same one.

A different pair drops every loaded resource and reads the new one's; the
same pair with a different token is the same session with a fresh credential,
which is what a token endpoint hands back on every call. So an inline
`token: async () => …` costs nothing: rebuilding that closure every render is
not a change.

`null` is signing out. Every card empties, and nothing is read until a
session returns — which matters because your token endpoint may still mint
for the company being left, and those rows must not come back. `undefined`
says you do not know yet, which is what an auth resolving asynchronously
renders first: it states nothing, so nothing is dropped, and the cards hold
their loading state rather than reporting an error.

Those three have to be told apart by you, and auth libraries often collapse
two of them. Clerk reports `undefined` both while it loads and when nobody is
signed in, so read `isLoaded` before deciding which you mean.

`token` is a string or a provider called (and re-called after a 401) for one.
Without a session the element reports the missing token in its status frame.

For server rendering, `fetchBillingData` in schematic-js returns an
`initialData` bag the provider seeds from. Name the resources the page
renders, since each is a request on the server (the upcoming invoice is a
live billing-provider preview) and there is no default set. Every element
declares what it reads as `resources`, and `billingResources` collects them:

```ts
fetchBillingData(client, {
  names: billingResources(UpcomingBill, Invoices),
  invoices: { includePending: true },
});
```

Pass the query your element asks, as above, or the seed answers a question
nothing asked and the element fetches it again.

Those rows show on the first render even though your auth usually resolves a
render later, and they are checked against it: `fetchBillingData` records
which company it fetched for, and rows stamped with a different company than
the session names are refetched rather than shown. Rows outlive the render
that fetched them — a cached page, a tab that switched company — which is
what the stamp is for. A prefetch you build yourself carries no stamp and is
taken at face value, so pair it with the session it belongs to. A session
that has ended is shown nothing either way. Pass `locale` explicitly for a
server-rendered page: the viewer's language is not knowable on the server, so
the elements format in `en-US` until they mount and only then adopt it —
matching markup on both sides rather than a hydration mismatch per row.

## Styling

`<SchematicStyles />` injects one stylesheet driven by `--schematic-*`
custom properties: `accent`, `accent-contrast`, `background`, `border`,
`card-divider`, `card-padding`, `danger`, `font-body`, `font-heading`,
`line-height`, `line-height-heading`, `meter-track`, `muted`, `primary`,
`primary-contrast`, `radius`, `shadow`, `space`, `text`, `warning`.

### Light and dark

The elements follow `color-scheme`. Declare it wherever your theme is
decided and they come with it — no bridge, no attribute of ours to toggle:

```css
:root {
  color-scheme: light;
}
:root:where(.dark) {
  color-scheme: dark;
}
```

That is the whole contract. It works with a class-based switcher, with
`color-scheme: light dark` to follow the OS, and with a page that is only
ever one of the two. **A host that themes without declaring `color-scheme`
gets the light palette**, since that is all `light-dark()` can infer.

### Overriding a token

Set it anywhere — `:root`, an ancestor, inside a cascade layer, at any
specificity:

```css
:root {
  --schematic-accent: var(--brand);
}
```

The defaults are not declared in a rule; they are `var()` fallbacks inlined
at each use. A fallback applies only when the property is set nowhere, so
your value cannot lose a cascade to ours. That matters more than it sounds:
a default declared on `:root` would beat a host's own `@layer base { :root }`
tokens outright, because layer order is resolved before specificity, and
nothing about the failure would be visible.

The cost is that `--schematic-*` is undefined until you set it, so your own
CSS cannot read our defaults. `schematicTokensCss` is the palette as a
`:root` block if you want them globally; import it deliberately, and put it
where your own tokens can still win. `SCHEMATIC_TOKENS` is the same data as
an object.

Overriding `background` and `text` alone leaves a card looking half-themed —
`border`, `card-divider`, and `shadow` carry the rest.

Or skip the stylesheet and write your own against the class names below —
they are API, and each element's doc shows the tree it renders.

| Class                         | Where                                                      |
| ----------------------------- | ---------------------------------------------------------- |
| `schematic-card`              | Every element's root, with the element's own class.        |
| `schematic-header`            | The heading row inside a card.                             |
| `schematic-header__title`     | The heading itself, whatever `headingLevel` renders.       |
| `schematic-muted`             | Secondary text.                                            |
| `schematic-small`             | Smaller text.                                              |
| `schematic-chip`              | A short status label; the raw value is `[data-status]`.    |
| `schematic-badge`             | A filled pill.                                             |
| `schematic-cta`               | Filled action; `--outline` and `--small` modifiers.        |
| `schematic-link-button`       | Inline text action ("See more", "Try again", "Load more"). |
| `schematic-status`            | The error row that replaces a card's content.              |
| `schematic-status__message`   | The message within it.                                     |
| `schematic-status__retry`     | Its retry action.                                          |
| `schematic-error`             | Error text.                                                |
| `schematic-status-note`       | A failure reported under content that is still on screen.  |
| `schematic-skeleton`          | The pending placeholder, rendered inside the card.         |
| `schematic-skeleton__heading` | The bar standing in for a card's heading.                  |
| `schematic-skeleton__row`     | One row of the pending placeholder.                        |
| `schematic-skeleton__cell`    | A bar within that row; its column is `[data-column]`.      |

An element's root keeps the same class list in every state; `data-state` is
`pending`, `error`, or `ready`.

Every node an element renders carries at least one `schematic-` class, so no
rule has to reach for a tag or a position — `elements/markup.test.tsx` holds
that line along with the per-element trees.
