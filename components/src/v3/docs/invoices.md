# Invoices

The company's invoice history: a dated link to each hosted invoice and its amount, with credit notes in parentheses.

## Hook and derivation

`useInvoices(query?)` serves `GET /company/invoices` as an `InvoicePage` (`invoices` plus `hasMore`) and adds `loadMore()`, which appends the next page. `query` is an `InvoiceQuery` (`{ includePending?: boolean }`); each distinct query is its own list with its own paging, so `useInvoices({ includePending: true })` and `useInvoices()` never share rows. `refetch()` re-requests every page loaded so far, not only the first. `deriveInvoiceList` formats each row: the due date (or created date) for the locale, the absolute amount, `isCredit` for negative invoices, and `status` as the API reports it. Which statuses read as good or bad is the host's call, so the derivation assigns no tone.

Paging shares the handle's fields with loading: `isPending` is true while a page is on the wire and a failed page records the error there, keeping the rows already fetched on screen. So a button can disable and report without awaiting anything, and clicking twice makes one request. `loadMore()` also returns a promise that settles when the page does and never rejects — read `error` for the failure.

```tsx
import {
  deriveInvoiceList,
  useInvoices,
} from "@schematichq/schematic-components/v3";

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
<Invoices limit={3} showStatus />
```

| Prop                     | Default | Effect                                                          |
| ------------------------ | ------- | --------------------------------------------------------------- |
| `limit`                  | `10`    | Rows shown before "See more".                                   |
| `collapsible`            | `true`  | Collapse to `limit` rows; "Load more" appears once expanded.    |
| `showHeader`             | `true`  | The heading.                                                    |
| `showDate`, `showAmount` | `true`  | The date and amount columns.                                    |
| `showStatus`             | `false` | A status chip per row.                                          |
| `headingLevel`           | `2`     | The heading's level, to fit the host's outline.                 |
| `query`                  | `{}`    | Which rows the server returns, e.g. `{ includePending: true }`. |
| `className`, `locale`    | —       | Root class; BCP 47 tag for formatting.                          |
| `strings`                | —       | Copy for this card by key; wins over the provider's.            |

`locale` falls back to the one configured on the provider, then to the
viewer's language; see [Localizing it](#localizing-it) for the copy.

A failure with rows still on screen — a refetch or a page that did not land —
is reported under the table rather than replacing it; only a failure with
nothing to show takes over the card.

## Localizing it

`locale` localizes the formatting; the words come from `strings` or from the
host's `translate`. [localization.md](./localization.md) is the full
reference — the short version is that `strings={{ invoicesHeader: "Receipts" }}`
renames the card with no i18n stack, and `translate={t}` routes every string
through i18next.

The keys this element renders are `invoicesHeader`, `invoicesLoading`,
`invoicesEmpty`, `invoicesDateColumn`, `invoicesAmountColumn`,
`invoicesStatusColumn`, `invoicesSeeMore`, `invoicesSeeLess`,
`invoicesLoadMore`, `invoicesCredit`, `retry`, and one per status —
`invoiceStatusDraft`, `invoiceStatusOpen`, `invoiceStatusPaid`,
`invoiceStatusUncollectible`, `invoiceStatusVoid`. `strings.test.ts` freezes
the list, so a rename is a deliberate, breaking change.

## Markup

What the element renders, for a host styling it without `<SchematicStyles />`.
The root's class list is the same in all three states — read `data-state` to
tell them apart. Each column's class sits on its header as well as its cells,
so alignment is set once and the two cannot disagree; `__column` and
`__cell` tell the two apart.

```html
<div class="schematic-card schematic-invoices" data-state="ready">
  <div class="schematic-header">
    <h2 class="schematic-header__title">Invoices</h2>
    <!-- the row count, omitted when there are none -->
    <span class="schematic-small schematic-muted schematic-invoices__count">
      3 invoices
    </span>
  </div>

  <!-- with no rows, in place of the table -->
  <p class="schematic-muted schematic-invoices__empty">No invoices yet</p>

  <table class="schematic-invoices__table">
    <thead class="schematic-invoices__head">
      <tr class="schematic-invoices__head-row">
        <th
          class="schematic-invoices__column schematic-invoices__date"
          scope="col"
        >
          Date
        </th>
        <th
          class="schematic-invoices__column schematic-invoices__amount"
          scope="col"
        >
          Amount
        </th>
        <th
          class="schematic-invoices__column schematic-invoices__status"
          scope="col"
        >
          Status
        </th>
      </tr>
    </thead>
    <tbody class="schematic-invoices__body">
      <tr class="schematic-invoices__row" data-testid="schematic-invoice">
        <td class="schematic-invoices__cell schematic-invoices__date">
          <!-- .schematic-invoices__date-text when the invoice has no URL -->
          <a class="schematic-invoices__link">…</a>
        </td>
        <td class="schematic-invoices__cell schematic-invoices__amount">
          <!-- credit notes only; a plain amount is bare text in the cell -->
          <span class="schematic-invoices__credit">($15.00)</span>
        </td>
        <td class="schematic-invoices__cell schematic-invoices__status">
          <span
            class="schematic-chip schematic-invoices__chip"
            data-status="paid"
            >Paid</span
          >
        </td>
      </tr>
    </tbody>
  </table>

  <div class="schematic-invoices__actions">
    <button class="schematic-link-button schematic-invoices__see-more">
      See more
    </button>
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
  role="status"
  aria-busy="true"
  aria-label="Loading invoices"
>
  <!--
    Shaped like the card it becomes: a heading bar when `showHeader`, and a
    bar per rendered column on each row. Rows are `limit`, capped at four.
  -->
  <div class="schematic-skeleton">
    <div class="schematic-skeleton__heading"></div>
    <div class="schematic-skeleton__row">
      <div class="schematic-skeleton__cell" data-column="date"></div>
      <div class="schematic-skeleton__cell" data-column="amount"></div>
      <div class="schematic-skeleton__cell" data-column="status"></div>
    </div>
  </div>
</div>

<div class="schematic-card schematic-invoices" data-state="error">
  <div class="schematic-status">
    <span class="schematic-error schematic-status__message">…</span>
    <button class="schematic-link-button schematic-status__retry">Retry</button>
  </div>
</div>
```

Chips render neutral; style them per status with `[data-status]`, whose value
is the raw `InvoiceStatus`. `elements/markup.test.tsx` freezes this contract.
