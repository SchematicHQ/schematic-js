import {
  CompanyDataProvider,
  type CompanyData,
} from "@schematichq/schematic-react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { discount, upcomingInvoice } from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";

import { UpcomingBill, type UpcomingBillProps } from "./UpcomingBill";

const L = "en-US";

function renderBill(
  data: CompanyData = SCENARIOS.pro(),
  props: UpcomingBillProps = {},
  handlers: {
    status?: React.ComponentProps<typeof CompanyDataProvider>["status"];
    onRefetch?: (name: "invoices" | "upcomingInvoice") => void;
    translate?: React.ComponentProps<typeof CompanyDataProvider>["translate"];
  } = {},
) {
  return render(
    <CompanyDataProvider
      data={data}
      status={handlers.status}
      translate={handlers.translate}
      onRefetch={handlers.onRefetch}
    >
      <UpcomingBill locale={L} {...props} />
    </CompanyDataProvider>,
  );
}

describe("UpcomingBill", () => {
  test("renders a skeleton while the next bill loads", () => {
    renderBill({});
    const pending = screen.getByRole("status", {
      name: "Loading your next bill",
    });
    expect(pending).toHaveAttribute("data-state", "pending");
    expect(pending).toHaveAttribute("aria-busy", "true");
  });

  test("renders an error with retry, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    renderBill(
      {},
      {},
      { status: { upcomingInvoice: { error: new Error("Boom") } }, onRefetch },
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    screen.getByRole("button", { name: "Retry" }).click();
    expect(onRefetch).toHaveBeenCalledWith("upcomingInvoice");
  });

  test("renders the bill: heading, amount, balance, and discount", () => {
    renderBill();
    expect(
      screen.getByRole("heading", { name: /^Next bill due / }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("schematic-upcoming-total")).toHaveTextContent(
      "$68.00",
    );
    expect(screen.getByText("Estimated bill")).toBeInTheDocument();
    expect(screen.getByTestId("schematic-balance-applied")).toHaveTextContent(
      "-$15.00",
    );
    expect(screen.getByTestId("schematic-balance-remaining")).toHaveTextContent(
      "$0.00",
    );
    const row = screen.getByTestId("schematic-discount");
    expect(row).toHaveTextContent("LAUNCH20");
    expect(row).toHaveTextContent("20% off for 3 months");
  });

  test("counts a single repeating month in the singular", () => {
    renderBill({
      upcomingInvoice: upcomingInvoice({
        discounts: [discount({ durationInMonths: 1 })],
      }),
    });
    expect(screen.getByTestId("schematic-discount")).toHaveTextContent(
      "20% off for 1 month",
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

  test("names a coupon that carries no promo code", () => {
    renderBill({
      upcomingInvoice: upcomingInvoice({
        discounts: [discount({ customerFacingCode: null })],
      }),
    });
    const row = screen.getByTestId("schematic-discount");
    expect(row).toHaveTextContent("Launch");
    expect(row.querySelector(".schematic-chip")).toBeNull();
  });

  test("renders the empty state when there is nothing to bill", () => {
    renderBill(SCENARIOS.unbilled());
    expect(screen.getByText("No upcoming invoice")).toBeInTheDocument();
    expect(screen.queryByTestId("schematic-upcoming-total")).toBeNull();
    // Loaded, not pending: `null` is the server's answer.
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("says nothing about a balance the company does not have", () => {
    renderBill({ upcomingInvoice: upcomingInvoice() });
    expect(screen.queryByTestId("schematic-balance-applied")).toBeNull();
    expect(screen.queryByTestId("schematic-balance-remaining")).toBeNull();
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
    expect(screen.queryByTestId("schematic-discount")).toBeNull();
  });

  test("renders its heading at the level the host asks for", () => {
    renderBill(SCENARIOS.pro(), { headingLevel: 4 });
    expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
  });

  test("falls back to an undated heading", () => {
    renderBill({ upcomingInvoice: upcomingInvoice({ dueDate: null }) });
    expect(
      screen.getByRole("heading", { name: "Next bill" }),
    ).toBeInTheDocument();
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
    expect(screen.getByRole("alert")).toHaveTextContent("Later");
  });
});
