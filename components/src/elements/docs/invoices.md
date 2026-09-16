# Invoices

The company's invoice history: a dated link to each hosted invoice and its amount, with credit notes in parentheses.

## Hook and derivation

`useInvoices(query?)` serves `GET /company/invoices` as an `InvoicePage` (`invoices`, `count`, and `hasMore`) and adds `loadMore()`, which appends the next page. `count` is how many invoices the query matches on the server, so a card showing four rows can say how many the company has; `hasMore` is that count set against the rows loaded. A 404 here means the account is not on the `company-context-api` flag rather than that the company has no invoices — an empty history is a 200 with `count: 0` — so it surfaces as an error, and a page cannot quietly report "no invoices" over a real one. `query` is an `InvoiceQuery` (`{ includePending?: boolean }`); each distinct query is its own list with its own paging, so `useInvoices({ includePending: true })` and `useInvoices()` never share rows. `refetch()` re-requests every page loaded so far, not only the first, up to the largest page the API serves. `deriveInvoiceList` formats each row: the due date (or created date) for the locale, the absolute amount, `isCredit` for negative invoices, and `status` as the API reports it. Which statuses read as good or bad is the host's call, so the derivation assigns no tone.

Paging shares the handle's fields with loading: `isPending` is true while a page is on the wire and a failed page records the error there, keeping the rows already fetched on screen. So a button can disable and report without awaiting anything, and clicking twice makes one request. `loadMore()` also returns a promise that settles when the page does and never rejects — read `error` for the failure.

```tsx
import {
  deriveInvoiceList,
  useInvoices,
} from "@schematichq/schematic-components/elements";

function History() {
  const { data: page, loadMore } = useInvoices();
  if (page === undefined) return null;
  const list = deriveInvoiceList(page, { locale: "en-US" });
  return (
    <>
      <ul>
        {list.rows.map((row) => (
          <li key={row.id}>
            {row.url === null ? (
              row.dateText
            ) : (
              <a href={row.url}>{row.dateText}</a>
            )}{" "}
            {row.isCredit ? `(${row.amountText})` : row.amountText}
          </li>
        ))}
      </ul>
      {list.hasMore && <button onClick={loadMore}>Load more</button>}
    </>
  );
}
```

## The styled element

```tsx
<Invoices limit={3} />
```

| Prop                     | Default | Effect                                                          |
| ------------------------ | ------- | --------------------------------------------------------------- |
| `limit`                  | `10`    | Rows shown before "See more".                                   |
| `collapsible`            | `true`  | Collapse to `limit` rows; "Load more" appears once expanded.    |
| `showHeader`             | `true`  | The heading.                                                    |
| `showDate`, `showAmount` | `true`  | The date and the amount on each row.                            |
| `headingLevel`           | `2`     | The heading's level, to fit the host's outline.                 |
| `query`                  | `{}`    | Which rows the server returns, e.g. `{ includePending: true }`. |
| `className`, `locale`    | —       | Root class; BCP 47 tag for formatting.                          |
| `strings`                | —       | Copy for this card by key; wins over the provider's.            |

`locale` falls back to the one configured on the provider, then to the
viewer's language; see [Localizing it](#localizing-it) for the copy.

Every amount carries a tooltip saying whether it was a charge or a credit,
as the embed's does.

A failure with rows still on screen — a refetch or a page that did not land —
is reported under the list rather than replacing it; only a failure with
nothing to show takes over the card. A 404 with nothing to show — the
account is not on the flag that serves company reads — renders "Invoices are
not available for this account."; every other failure, and a 404 under rows
already loaded, reads "There was a problem retrieving your invoices." Both
offer "Try again". Neither shows the error's own message; in development it is logged
to the console beside the copy, so a missing provider or a refused request
is diagnosable from the page. `httpStatus(error)` is exported for a host
rendering its own markup that wants the same distinction.

## Localizing it

`locale` localizes the formatting; the words come from `strings` or from the
host's `translate`. `strings={{ invoicesHeader: "Receipts" }}` renames the card
with no i18n stack, and `translate={t}` routes every string through i18next.

The keys this element renders are `invoicesHeader`, `invoicesLoading`,
`invoicesError`, `invoicesEmpty`, `invoicesSeeMore`, `invoicesSeeLess`,
`invoicesLoadMore`, `invoicesChargeTooltip`, `invoicesCreditTooltip`,
`invoicesUnavailable`, `invoicesUndated`, and `retry`. `strings.test.ts` freezes the list, so a
rename is a deliberate, breaking change.

The catalogue is the element's copy, not a vocabulary for the domain. A host
rendering its own list on `useInvoices` can call `useTranslator` for the
strings it shares with the card — the heading, the empty state, "See more" —
and owns whatever else it renders: a status label, a column header, or a
count beside the heading is the host's copy, written where the markup is.
`plural(locale, count, forms)` is exported for a host's own count-bearing
strings.

## Markup

What the element renders, for a host styling it without `<SchematicStyles />`.
The root's class list is the same in all three states — read `data-state` to
tell them apart.

```html
<div class="schematic-card schematic-invoices" data-state="ready">
  <div class="schematic-header">
    <h2 class="schematic-header__title">Invoices</h2>
  </div>

  <!-- with no rows, in place of the list -->
  <p class="schematic-muted schematic-invoices__empty">
    No invoices created yet
  </p>

  <ul class="schematic-invoices__list">
    <li class="schematic-invoices__row" data-testid="schematic-invoice">
      <span class="schematic-invoices__date">
        <!-- .schematic-invoices__date-text when the invoice has no URL -->
        <a class="schematic-invoices__link">…</a>
      </span>
      <!-- title: "Charge — you were billed this amount", or the credit copy;
           credit notes add .schematic-invoices__credit and parentheses -->
      <span class="schematic-invoices__amount">$68.00</span>
    </li>
  </ul>

  <div class="schematic-invoices__actions">
    <button
      class="schematic-link-button schematic-invoices__see-more"
      aria-expanded="false"
    >
      <span class="schematic-invoices__chevron" aria-hidden="true"></span>
      See more
    </button>
    <!-- only once every loaded row is showing and the server has more -->
    <button class="schematic-link-button schematic-invoices__load-more">
      Load more
    </button>
  </div>

  <!-- a failure with rows still on screen -->
  <p class="schematic-status-note schematic-error">…</p>
</div>

<div
  class="schematic-card schematic-invoices"
  data-state="pending"
  aria-busy="true"
>
  <!-- Read by assistive technology, never seen. Not a live region: nothing
       announces the rows arriving, so nothing here promises it will. -->
  <span class="schematic-hidden">Loading invoices</span>
  <!--
    Shaped like the card it becomes: a heading bar when `showHeader`, and a
    bar per rendered column on each row. Rows are `limit`, capped at four.
  -->
  <div class="schematic-skeleton">
    <div class="schematic-skeleton__heading"></div>
    <div class="schematic-skeleton__row">
      <div class="schematic-skeleton__cell" data-column="date"></div>
      <div class="schematic-skeleton__cell" data-column="amount"></div>
    </div>
  </div>
</div>

<div class="schematic-card schematic-invoices" data-state="error">
  <div class="schematic-status">
    <span class="schematic-error schematic-status__message">
      There was a problem retrieving your invoices.
    </span>
    <button class="schematic-link-button schematic-status__retry">
      Try again
    </button>
  </div>
</div>
```

`elements/markup.test.tsx` freezes this contract.
