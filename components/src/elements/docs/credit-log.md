# CreditLog

The company's recent credit activity, newest first: what drew credits and who, plus grants, top-ups and expiries. A few rows show at first; "See full log" opens a table that pages back through the rest.

## Hooks and derivation

`useCreditLedger(query)` reads the company's credit activity, which the store loads from `GET /company/credits/ledger` the first time any component reads it, 20 entries a page. `data` is a `CreditLedgerPage` (`entries`, `hasMore`); `loadMore()` appends the next page, and `refetch()` reloads every page already loaded. Each distinct query is its own list: `credits` narrows it to some credit ids, and `includeGrants: false` to draws. A 404 means the account is not on the `company-context-api` flag and surfaces as an error.

The server folds the ledger before it arrives:

- A draw written against several grants is one entry, and each user's share of it is its own.
- Lease and reservation holds are left out; the track a hold funds is the draw.
- Postpaid bookkeeping grants and the zero-outs a billing provider's sync writes are left out.
- `amount` is signed: negative for draws and expiries, positive for grants and refunded draws.
- `kind` is `drawdown`, `grant` or `zero_out`, with `usageReason`, `grantReason` or `zeroedOutReason` beside it.

`deriveCreditLog` turns a page into display rows: a `kind` (`draw`, `reversal`, `grant`, `topup`, `expiry`), an `action` keyed for copy with the feature or bundle it names, `who` (a user, or where the credits came from), the absolute amount to ten fraction digits with its sign in `positive`, the credit's name for that amount (`unit`) and for the row (`creditName`), and the time, with `day` set for today and yesterday. `credit` names the one credit every row is in, or is `null` when the log spans several.

```tsx
import {
  deriveCreditLog,
  useCreditLedger,
} from "@schematichq/schematic-components/elements";

function Activity() {
  const { data, loadMore } = useCreditLedger({ credits: ["bcr_ai"] });
  if (data === undefined) return <Spinner />;

  const { rows, hasMore } = deriveCreditLog(data, { locale: "en-US" });
  return (
    <>
      {rows.map((row) => (
        <p key={row.id}>
          {row.subject ?? row.action} {row.positive ? "+" : "−"}
          {row.amountText} {row.unit}
        </p>
      ))}
      {hasMore && <button onClick={() => void loadMore()}>More</button>}
    </>
  );
}
```

## The styled element

```tsx
<CreditLog limit={3} onSeeAll={() => navigate("/billing/credits")} />
```

| Prop                        | Default | Effect                                                                   |
| --------------------------- | ------- | ------------------------------------------------------------------------ |
| `credits`                   | —       | Credit ids to show; every credit when absent.                            |
| `limit`                     | `3`     | Rows shown before "See full log".                                        |
| `showUser`                  | `true`  | Who each row is attributed to.                                           |
| `showGrants`                | `true`  | Grants, top-ups and expiries beside the draws.                           |
| `showHeader`                | `true`  | The "Credit activity" heading.                                           |
| `onSeeAll`                  | —       | "See all" calls this instead of "See full log" opening the log in place. |
| `seeAllUrl`, `seeAllTarget` | —       | "See all" links here when there is no `onSeeAll`.                        |
| `headingLevel`              | `2`     | The heading's level.                                                     |
| `className`, `locale`       | —       | Root class; BCP 47 tag for formatting.                                   |
| `strings`                   | —       | Copy for this element by key; wins over the provider's.                  |

Amounts are bare numbers. A log in one credit names it once, beside the heading; a log across several credits, or one without the heading, names each row's credit after its time and who. "See full log" shows when there are more rows than `limit` or more on the server, and opens a table of date, activity, by and amount (with the credit before the amount when the log spans several) in place, with "Load more" until the server has nothing older, and "See less" back. Long names in the by and credit columns are cut with an ellipsis, with the full name on hover. In a card narrower than 30rem the table stacks each row: what happened and the amount, then the date, who and credit beneath. With `onSeeAll` or `seeAllUrl` it is "See all" instead, for the host's own page. A draw sent without a user shows no one. An empty log says so in one line.

## Localizing it

The card's copy is under `creditLog*`: `creditLogAction*` for each action, `creditLogWho*` for where credits came from, and `creditLogToday` / `creditLogYesterday` around the time.
