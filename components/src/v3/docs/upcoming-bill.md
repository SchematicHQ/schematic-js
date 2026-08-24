# UpcomingBill

The company's next bill: the estimated amount and due date, the customer balance and discounts that shaped it, and the contract end when the subscription is scheduled to stop.

## Hook and derivation

`useUpcomingInvoice()` serves `GET /company/upcoming-invoice`; its data is `null` when there is nothing to invoice. `deriveUpcomingInvoice(invoice, subscription, { locale })` formats the amounts, the due date, the discounts with a positive value, the applied and remaining balance (present only when a balance exists), the subscription's period word, and `contractEndsAt` from `subscription.cancelAt`. `deriveContractEnd` gives the contract end on its own, for the empty state.

```tsx
import {
  deriveContractEnd,
  deriveUpcomingInvoice,
  useCompany,
  useUpcomingInvoice,
} from "@schematichq/schematic-components/v3";

function NextBill() {
  const { data: invoice } = useUpcomingInvoice();
  const { data: company } = useCompany();
  const subscription = company?.subscription ?? null;
  if (invoice === undefined) return null;
  if (invoice === null || subscription === null) {
    const end = deriveContractEnd(subscription, { locale: "en-US" });
    return (
      <p>No upcoming invoice{end !== null && `. Contract ends ${end.text}`}</p>
    );
  }
  const bill = deriveUpcomingInvoice(invoice, subscription, {
    locale: "en-US",
  });
  return (
    <p>
      {bill.amountDueText} due {bill.dueAt?.text}
      {bill.discounts.map((d) => ` · ${d.valueText} off`)}
    </p>
  );
}
```

## The styled element

```tsx
<UpcomingBill headerPrefix="Next payment" />
```

| Prop                                    | Default                  | Effect                                                    |
| --------------------------------------- | ------------------------ | --------------------------------------------------------- |
| `showHeader` / `headerPrefix`           | `true` / "Next bill due" | The heading, followed by the due date.                    |
| `showAmount`                            | `true`                   | The estimated amount.                                     |
| `showDiscounts`                         | `true`                   | A row per discount: code chip and "20% off for 3 months". |
| `showBalance`                           | `true`                   | Applied and remaining customer-balance rows.              |
| `showContractEnd` / `contractEndPrefix` | `true` / "Contract ends" | The contract end line, also in the empty state.           |
| `className`, `locale`                   | —                        | Root class; BCP 47 tag for formatting.                    |
