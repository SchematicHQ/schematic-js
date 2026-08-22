import {
  CatalogDataProvider,
  type CatalogData,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import {
  company,
  daysFromNow,
  discount,
  subscription,
  upcomingInvoice,
} from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";
import { formatDate } from "../model";

import { UpcomingBill, type UpcomingBillProps } from "./UpcomingBill";

const L = "en-US";
const longDate = (days: number) => formatDate(daysFromNow(days), L);

function renderBill(
  data: CatalogData = SCENARIOS.pro(),
  props: UpcomingBillProps = {},
  status?: React.ComponentProps<typeof CatalogDataProvider>["status"],
) {
  return render(
    <CatalogDataProvider data={data} status={status}>
      <UpcomingBill locale={L} {...props} />
    </CatalogDataProvider>,
  );
}

describe("UpcomingBill", () => {
  test("renders a skeleton while the invoice loads", () => {
    renderBill({});
    expect(screen.getByLabelText("Loading upcoming bill")).toBeInTheDocument();
  });

  test("renders an error with retry, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    render(
      <CatalogDataProvider
        data={{}}
        status={{ upcomingInvoice: { error: new Error("Boom") } }}
        onRefetch={onRefetch}
      >
        <UpcomingBill />
      </CatalogDataProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRefetch).toHaveBeenCalledWith("upcomingInvoice");
  });

  test("renders the due date, amount, and discount", () => {
    renderBill();
    expect(
      screen.getByRole("heading", { name: `Next bill due ${longDate(20)}` }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sch-upcoming-amount")).toHaveTextContent(
      "$61.20",
    );
    expect(screen.getByText("Estimated bill")).toBeInTheDocument();
    const row = screen.getByTestId("sch-discount");
    expect(row).toHaveTextContent("Discount");
    expect(within(row).getByText("LAUNCH20")).toHaveClass("schematic-chip");
    expect(row).toHaveTextContent("20% off for 3 months");
    expect(screen.queryByTestId("sch-balance-applied")).toBeNull();
    expect(screen.queryByTestId("sch-balance-remaining")).toBeNull();
    expect(screen.queryByTestId("sch-contract-end")).toBeNull();
  });

  test("renders amount-off discounts without a code by coupon name", () => {
    const data = SCENARIOS.pro();
    data.upcomingInvoice = upcomingInvoice({
      discounts: [
        discount({
          couponName: "Five off",
          customerFacingCode: null,
          percentOff: null,
          amountOff: 500,
          currency: "usd",
          duration: "once",
          durationInMonths: null,
        }),
      ],
    });
    renderBill(data);
    const row = screen.getByTestId("sch-discount");
    expect(row).toHaveTextContent("Five off");
    expect(row).toHaveTextContent("$5.00 off");
    expect(row).not.toHaveTextContent("for");
  });

  test("renders the applied and remaining balance rows", () => {
    const data = SCENARIOS.pro();
    data.upcomingInvoice = upcomingInvoice({
      amountDue: 500,
      subtotal: 1000,
      customerBalanceApplied: 500,
      customerBalanceRemaining: 200,
    });
    renderBill(data);
    expect(screen.getByTestId("sch-balance-applied")).toHaveTextContent(
      "Applied balance towards next invoice-$5.00",
    );
    expect(screen.getByTestId("sch-balance-remaining")).toHaveTextContent(
      "Remaining balance after next invoice$2.00",
    );
  });

  test("renders the contract end on a subscription scheduled to end", () => {
    const data = SCENARIOS.pro();
    data.company = {
      ...data.company!,
      subscription: subscription({ cancelAt: daysFromNow(20) }),
    };
    renderBill(data);
    expect(screen.getByTestId("sch-upcoming-amount")).toHaveTextContent(
      "$61.20",
    );
    expect(screen.getByTestId("sch-contract-end")).toHaveTextContent(
      `Contract ends ${longDate(20)}`,
    );
  });

  test("a canceling subscription with nothing to invoice still shows the contract end", () => {
    renderBill(SCENARIOS.canceling());
    expect(screen.getByText("No upcoming invoice")).toBeInTheDocument();
    expect(screen.getByTestId("sch-contract-end")).toHaveTextContent(
      `Contract ends ${longDate(20)}`,
    );
    expect(screen.queryByTestId("sch-upcoming-amount")).toBeNull();
  });

  test("renders the empty state without a subscription", () => {
    renderBill(SCENARIOS.noPlan());
    expect(screen.getByText("No upcoming invoice")).toBeInTheDocument();
    expect(screen.queryByTestId("sch-contract-end")).toBeNull();
  });

  test("treats an invoice on a company without a subscription as nothing to bill", () => {
    renderBill({ upcomingInvoice: upcomingInvoice(), company: company() });
    expect(screen.getByText("No upcoming invoice")).toBeInTheDocument();
  });

  test("renders the invoice alone while the company is still loading", () => {
    renderBill({ upcomingInvoice: upcomingInvoice({ amountDue: 1000 }) });
    expect(screen.getByTestId("sch-upcoming-amount")).toHaveTextContent(
      "$10.00",
    );
  });

  test("renders the prefix alone without a due date", () => {
    const data = SCENARIOS.pro();
    data.upcomingInvoice = upcomingInvoice({ dueDate: null });
    renderBill(data, { headerPrefix: "Upcoming" });
    expect(
      screen.getByRole("heading", { name: "Upcoming" }),
    ).toBeInTheDocument();
  });

  test("display toggles hide the header, amount, discounts, balance, and contract end", () => {
    const data = SCENARIOS.pro();
    data.upcomingInvoice = upcomingInvoice({
      discounts: [discount()],
      customerBalanceApplied: 500,
      customerBalanceRemaining: 0,
    });
    data.company = {
      ...data.company!,
      subscription: subscription({ cancelAt: daysFromNow(20) }),
    };
    renderBill(data, {
      showAmount: false,
      showBalance: false,
      showContractEnd: false,
      showDiscounts: false,
      showHeader: false,
    });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByTestId("sch-upcoming-amount")).toBeNull();
    expect(screen.queryByTestId("sch-discount")).toBeNull();
    expect(screen.queryByTestId("sch-balance-applied")).toBeNull();
    expect(screen.queryByTestId("sch-contract-end")).toBeNull();
  });

  test("uses the custom prefixes", () => {
    const data = SCENARIOS.pro();
    data.company = {
      ...data.company!,
      subscription: subscription({ cancelAt: daysFromNow(20) }),
    };
    renderBill(data, {
      contractEndPrefix: "Ends",
      headerPrefix: "Due",
    });
    expect(
      screen.getByRole("heading", { name: `Due ${longDate(20)}` }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sch-contract-end")).toHaveTextContent(
      `Ends ${longDate(20)}`,
    );
  });
});
