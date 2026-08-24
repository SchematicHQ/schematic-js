# Invoices

The company's invoice history: a dated link to each hosted invoice and its amount, with credit notes in parentheses.

## Hook and derivation

`useInvoices()` serves `GET /company/invoices` as an `InvoicePage` (`invoices` plus `hasMore`) and adds `loadMore()`, which appends the next page. `deriveInvoiceList` formats each row: the due date (or created date) for the locale, the absolute amount, and `isCredit` for negative invoices.

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

| Prop                        | Default             | Effect                                                       |
| --------------------------- | ------------------- | ------------------------------------------------------------ |
| `limit`                     | `2`                 | Rows shown before "See more".                                |
| `collapsible`               | `true`              | Collapse to `limit` rows; "Load more" appears once expanded. |
| `showHeader` / `headerText` | `true` / "Invoices" | The heading.                                                 |
| `showDate`, `showAmount`    | `true`              | The date and amount columns.                                 |
| `showStatus`                | `false`             | A status chip per row.                                       |
| `className`, `locale`       | —                   | Root class; BCP 47 tag for formatting.                       |
