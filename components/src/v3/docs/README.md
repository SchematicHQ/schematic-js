# schematic-components v3

Code-first React elements on the company API. Each element reads one or two
resources through hooks from `@schematichq/schematic-react`, reduces them to
a domain model with a pure derivation, and renders with CSS-variable styling.

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

## Setup

```tsx
import { SchematicProvider } from "@schematichq/schematic-react";
import {
  Invoices,
  SchematicStyles,
} from "@schematichq/schematic-components/v3";

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
custom properties: `accent`, `background`, `border`, `card-divider`,
`card-padding`, `danger`, `font-body`, `font-heading`, `meter-track`,
`muted`, `primary`, `primary-contrast`, `radius`, `shadow`, `space`, `text`,
`warning`. Override them on `:root` or any ancestor.

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
