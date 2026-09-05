# Elements

`@schematichq/schematic-components/elements` — code-first React elements on
the company API. Each element reads one or two resources through hooks from
`@schematichq/schematic-react`, reduces them to a domain model with a pure
derivation, and renders with CSS-variable styling.

This release carries the first element; the rest land with the endpoints
that feed them.

Naming: `company` is the end-customer API tier that the elements read from
(`SchematicCompanyClient`, `CompanyProvider`, `fetchCompanyData`); `catalog`
is reserved for the offerings resource.

| Element  | Hooks         | Derivation          | Recipe                       |
| -------- | ------------- | ------------------- | ---------------------------- |
| Invoices | `useInvoices` | `deriveInvoiceList` | [invoices.md](./invoices.md) |

Cross-cutting: [localization.md](./localization.md) — locale, copy, and
rendering your own markup over the hooks.

## Before it can load

The company endpoints are gated on the `company-context-api` flag, per
account. An account without it gets a 404 from every `/company/*` read, and
because a 404 on the invoice history is not an answer — an empty history is
a 200 with no rows — the element reports it as an error rather than showing
a company with invoices an empty card. If a correctly configured page shows
`… failed with status 404`, the flag is what to check first. Ask Schematic
to turn it on for the account.

## Setup

```tsx
import { SchematicProvider } from "@schematichq/schematic-react";
import {
  Invoices,
  SchematicStyles,
} from "@schematichq/schematic-components/elements";

<SchematicProvider
  publishableKey="pk_…"
  accessToken={async () => (await fetch("/api/access-token")).json()}
>
  <SchematicStyles />
  <Invoices />
</SchematicProvider>;
```

Copy and formatting are the host's. `locale` on the provider formats every
element through `Intl`, and each string resolves through `strings` on the
element, then `strings` on the provider, then `translate` (the host's own
`t`), then the element's English — so nothing has to be configured, and
renaming one string is one prop. See [localization.md](./localization.md).

Signing out is `sessionKey={null}` — the host stating there is no session,
which empties every card rather than leaving the previous company's rows on
screen. `undefined` is different: it says the host does not know yet, which
is what an auth renders before it resolves, and states nothing. Naming a
session again is what revives one that ended.

`accessToken` identifies the session; without it the element reports the
missing token in its status frame. It takes a string or, as above, a provider
the client calls and re-calls after a 401. An inline arrow is fine and costs
nothing: a provider's identity is never read as a session, so re-rendering
one never drops a loaded resource or re-asks for a token. A different string
token does drop every loaded resource, as does clearing it.

A provider function is the one case that cannot speak for itself, and there
`sessionKey` is not a convenience but the only signal. An inline arrow
changes identity every render, so the provider handed to the client is one
stable function for the life of the component — which leaves nothing in it,
or in the token it returns, to say the company behind it changed. Without
`sessionKey`, swapping it for a different company's provider goes unnoticed
entirely: the old company's rows stay on screen. Pass a company id, or
whatever names the session:

```tsx
<SchematicProvider
  publishableKey="pk_…"
  accessToken={fetchToken}
  sessionKey={company.id}
/>
```

A change to it drops every loaded resource at once. A string `accessToken`
needs none of this; its value already says everything.

For server rendering, `fetchCompanyData(client)` in schematic-js returns an
`initialData` bag the provider seeds from. Pass `locale` explicitly for a
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

| Class                         | Where                                                     |
| ----------------------------- | --------------------------------------------------------- |
| `schematic-card`              | Every element's root, with the element's own class.       |
| `schematic-header`            | The heading row inside a card.                            |
| `schematic-header__title`     | The heading itself, whatever `headingLevel` renders.      |
| `schematic-muted`             | Secondary text.                                           |
| `schematic-small`             | Smaller text.                                             |
| `schematic-chip`              | A short status label; the raw value is `[data-status]`.   |
| `schematic-badge`             | A filled pill.                                            |
| `schematic-cta`               | Filled action; `--outline` and `--small` modifiers.       |
| `schematic-link-button`       | Inline text action ("See more", "Retry", "Load more").    |
| `schematic-status`            | The error row that replaces a card's content.             |
| `schematic-status__message`   | The message within it.                                    |
| `schematic-status__retry`     | Its retry action.                                         |
| `schematic-error`             | Error text.                                               |
| `schematic-status-note`       | A failure reported under content that is still on screen. |
| `schematic-skeleton`          | The pending placeholder, rendered inside the card.        |
| `schematic-skeleton__heading` | The bar standing in for a card's heading.                 |
| `schematic-skeleton__row`     | One row of the pending placeholder.                       |
| `schematic-skeleton__cell`    | A bar within that row; its column is `[data-column]`.     |

An element's root keeps the same class list in every state; `data-state` is
`pending`, `error`, or `ready`.

Every node an element renders carries at least one `schematic-` class, so no
rule has to reach for a tag or a position — `elements/markup.test.tsx` holds
that line along with the per-element trees.
