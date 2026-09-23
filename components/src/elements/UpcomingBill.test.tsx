import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingData,
} from "@schematichq/schematic-react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { UpcomingBill, type UpcomingBillProps } from "./UpcomingBill";
import { daysFromNow, discount, upcomingInvoice } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";
import { formatDate } from "./model";

const L = "en-US";

function renderBill(
  data: BillingData = SCENARIOS.pro(),
  props: UpcomingBillProps = {},
  handlers: {
    status?: React.ComponentProps<typeof BillingDataProvider>["status"];
    onRefetch?: React.ComponentProps<typeof BillingDataProvider>["onRefetch"];
    translate?: React.ComponentProps<typeof BillingDataProvider>["translate"];
  } = {},
) {
  return render(
    <BillingDataProvider
      data={data}
      status={handlers.status}
      translate={handlers.translate}
      onRefetch={handlers.onRefetch}
    >
      <UpcomingBill locale={L} {...props} />
    </BillingDataProvider>,
  );
}

describe("UpcomingBill", () => {
  test("says the next bill is loading, without a live region", () => {
    renderBill({});
    const label = screen.getByText("Loading your next bill");
    const pending = label.closest("[data-state]");
    expect(pending).toHaveAttribute("data-state", "pending");
    expect(pending).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("renders the error copy with Try again, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    renderBill(
      {},
      {},
      { status: { upcomingInvoice: { error: new Error("Boom") } }, onRefetch },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "There was a problem retrieving your upcoming invoice.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("Boom");
    screen.getByRole("button", { name: "Try again" }).click();
    expect(onRefetch).toHaveBeenCalledWith("upcomingInvoice");
  });

  test("does not ask the translator for error copy on a healthy render", () => {
    // Otherwise a host's translator would report a miss on every healthy render.
    const onMissingString = vi.fn();
    render(
      <BillingDataProvider
        data={SCENARIOS.pro()}
        onMissingString={onMissingString}
        translate={() => undefined}
      >
        <UpcomingBill />
      </BillingDataProvider>,
    );
    expect(onMissingString).toHaveBeenCalledWith("upcomingBillHeader");
    expect(onMissingString).not.toHaveBeenCalledWith("upcomingBillError");
    expect(onMissingString).not.toHaveBeenCalledWith("upcomingBillUnavailable");
  });

  test("says the bill is not available on a 404 with nothing to show", () => {
    // The account is not on the flag: never "no upcoming invoice", which a
    // subscribed customer would read as "I will not be charged".
    renderBill(
      {},
      {},
      {
        status: {
          upcomingInvoice: {
            error: new SchematicApiError(404, "/company/upcoming-invoice", {}),
          },
        },
      },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your upcoming invoice is not available for this account.",
    );
    expect(screen.queryByText("No upcoming invoice")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  test("keeps the generic copy for a 404 under a bill already on screen", () => {
    renderBill(
      SCENARIOS.pro(),
      {},
      {
        status: {
          upcomingInvoice: {
            error: new SchematicApiError(404, "/company/upcoming-invoice", {}),
          },
        },
      },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "There was a problem retrieving your upcoming invoice.",
    );
    expect(screen.getByTestId("schematic-upcoming-total")).toBeInTheDocument();
  });

  test("reports a refused request the same way as any other failure", () => {
    renderBill(
      {},
      {},
      {
        status: {
          upcomingInvoice: {
            error: new SchematicApiError(500, "/company/upcoming-invoice", {}),
          },
        },
      },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "There was a problem retrieving your upcoming invoice.",
    );
  });

  test("renders the bill: heading, amount, balance, and discount", () => {
    renderBill();
    expect(
      screen.getByRole("heading", {
        name: `Next bill due ${formatDate(daysFromNow(14), L)}`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("schematic-upcoming-total")).toHaveTextContent(
      "$68.00",
    );
    expect(screen.getByText("Estimated bill")).toBeInTheDocument();
    expect(screen.getByTestId("schematic-balance-applied")).toHaveTextContent(
      "Applied balance towards next invoice-$15.00",
    );
    expect(screen.getByTestId("schematic-balance-remaining")).toHaveTextContent(
      "Remaining balance after next invoice$0.00",
    );
    expect(screen.getByTestId("schematic-discounts")).toHaveTextContent(
      "Discount",
    );
    const row = screen.getByTestId("schematic-discount");
    expect(row).toHaveTextContent("LAUNCH20");
    expect(row).toHaveTextContent("20% off for next 3 months");
  });

  test("lists every discount under one label", () => {
    renderBill({
      upcomingInvoice: upcomingInvoice({
        discounts: [
          discount(),
          discount({
            couponName: "Loyalty",
            customerFacingCode: "LOYAL",
            duration: "forever",
            durationInMonths: undefined,
            percentOff: 5,
          }),
        ],
      }),
    });
    expect(screen.getAllByText("Discount")).toHaveLength(1);
    const rows = screen.getAllByTestId("schematic-discount");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent("LOYAL");
    expect(rows[1]).toHaveTextContent("5% off");
  });

  test("counts a single repeating month in the singular", () => {
    renderBill({
      upcomingInvoice: upcomingInvoice({
        discounts: [discount({ durationInMonths: 1 })],
      }),
    });
    expect(screen.getByTestId("schematic-discount")).toHaveTextContent(
      "20% off for next month",
    );
  });

  test("drops the repetition for a discount that does not repeat", () => {
    renderBill({
      upcomingInvoice: upcomingInvoice({
        discounts: [discount({ duration: "forever", durationInMonths: null })],
      }),
    });
    const row = screen.getByTestId("schematic-discount");
    expect(row).toHaveTextContent("20% off");
    expect(row).not.toHaveTextContent("month");
  });

  test("describes a fixed amount off", () => {
    renderBill({
      upcomingInvoice: upcomingInvoice({
        discounts: [
          discount({
            amountOff: 500,
            currency: "usd",
            duration: "once",
            durationInMonths: null,
            percentOff: null,
          }),
        ],
      }),
    });
    expect(screen.getByTestId("schematic-discount")).toHaveTextContent(
      "$5.00 off",
    );
  });

  test("shows no chip for a coupon that carries no promo code", () => {
    renderBill({
      upcomingInvoice: upcomingInvoice({
        discounts: [discount({ customerFacingCode: null })],
      }),
    });
    const row = screen.getByTestId("schematic-discount");
    expect(row).toHaveTextContent("20% off for next 3 months");
    expect(row).not.toHaveTextContent("Launch");
    expect(row.querySelector(".schematic-chip")).toBeNull();
  });

  test("renders the empty state when there is nothing to bill", () => {
    renderBill(SCENARIOS.unbilled());
    expect(screen.getByText("No upcoming invoice")).toBeInTheDocument();
    expect(screen.queryByTestId("schematic-upcoming-total")).toBeNull();
    // Loaded, not pending: `null` is the server's answer.
    expect(
      screen.getByText("No upcoming invoice").closest("[data-state]"),
    ).toHaveAttribute("data-state", "ready");
  });

  test("says nothing about a balance the company does not have", () => {
    renderBill(SCENARIOS.trialing());
    expect(screen.queryByTestId("schematic-balance-applied")).toBeNull();
    expect(screen.queryByTestId("schematic-balance-remaining")).toBeNull();
    expect(screen.queryByTestId("schematic-discounts")).toBeNull();
  });

  test("keeps the remaining balance row when none of it was applied", () => {
    renderBill({
      upcomingInvoice: upcomingInvoice({
        amountDue: 0,
        customerBalanceApplied: 0,
        customerBalanceRemaining: 3200,
      }),
    });
    expect(screen.queryByTestId("schematic-balance-applied")).toBeNull();
    expect(screen.getByTestId("schematic-balance-remaining")).toHaveTextContent(
      "$32.00",
    );
  });

  test("drops the heading, amount, balance, and discounts on request", () => {
    renderBill(SCENARIOS.pro(), {
      showAmount: false,
      showBalance: false,
      showDiscounts: false,
      showHeader: false,
    });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByTestId("schematic-upcoming-total")).toBeNull();
    expect(screen.queryByTestId("schematic-balance-applied")).toBeNull();
    expect(screen.queryByTestId("schematic-discounts")).toBeNull();
  });

  test("renders its heading at the level the host asks for", () => {
    renderBill(SCENARIOS.pro(), { headingLevel: 4 });
    expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
  });

  test("shows no heading for a bill the provider has not dated", () => {
    renderBill({ upcomingInvoice: upcomingInvoice({ dueDate: null }) });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByTestId("schematic-upcoming-total")).toHaveTextContent(
      "$68.00",
    );
  });

  test("keeps the bill on screen when a refetch fails", () => {
    renderBill(
      SCENARIOS.pro(),
      {},
      { status: { upcomingInvoice: { error: new Error("Later") } } },
    );
    expect(screen.getByTestId("schematic-upcoming-total")).toHaveTextContent(
      "$68.00",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "There was a problem retrieving your upcoming invoice.",
    );
  });

  test("renames the heading through strings", () => {
    renderBill(SCENARIOS.pro(), {
      strings: { upcomingBillHeader: "Due {{date}}" },
    });
    expect(
      screen.getByRole("heading", { name: /^Due \w+ \d+, \d{4}$/ }),
    ).toBeInTheDocument();
  });

  test("formats for the locale it is given", () => {
    renderBill(
      {
        upcomingInvoice: upcomingInvoice({ amountDue: 6800, currency: "eur" }),
      },
      { locale: "de-DE" },
    );
    expect(screen.getByTestId("schematic-upcoming-total")).toHaveTextContent(
      "68,00 €",
    );
  });
});
