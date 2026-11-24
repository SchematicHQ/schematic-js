import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingActions,
  type BillingData,
  type CreditOverdraft,
} from "@schematichq/schematic-react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { vi } from "vitest";

import { OverageLimit, type OverageLimitProps } from "./OverageLimit";
import { creditBalance, creditOverdraft } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

const L = "en-US";

function balances(
  fields: Partial<CreditOverdraft> = {},
  resetsAt: Date | undefined = undefined,
): BillingData {
  return {
    creditBalances: [
      creditBalance({
        creditId: "bcr_ai",
        overdraft: creditOverdraft(fields),
        resetsAt,
      }),
      creditBalance({ creditId: "bcr_export", creditName: "Export credit" }),
    ],
  };
}

function renderCard(
  data: BillingData = SCENARIOS.overageLimit(),
  props: OverageLimitProps = {},
  handlers: {
    actions?: Partial<BillingActions>;
    status?: React.ComponentProps<typeof BillingDataProvider>["status"];
  } = {},
) {
  return render(
    <BillingDataProvider
      actions={handlers.actions}
      data={data}
      status={handlers.status}
    >
      <OverageLimit locale={L} {...props} />
    </BillingDataProvider>,
  );
}

const card = () =>
  screen
    .getByRole("heading", { name: "Overages" })
    .closest(".schematic-overage-limit") as HTMLElement;

describe("OverageLimit", () => {
  test("says it is loading, in a skeleton", () => {
    const { container } = renderCard({});
    expect(
      screen.getByText("Loading your overage limit").closest("[data-state]"),
    ).toHaveAttribute("data-state", "pending");
    expect(
      container.querySelectorAll(".schematic-skeleton__row").length,
    ).toBeGreaterThan(0);
  });

  test("the plan's default, with no extra usage", () => {
    renderCard(balances());
    expect(
      screen.getByRole("heading", { level: 2, name: "Overages" }),
    ).toBeInTheDocument();
    const root = card();
    expect(root).toHaveTextContent("AI credit$0.02 per extra AI credit");
    expect(root).toHaveTextContent("5,000 AI credits");
    expect(root).toHaveTextContent("About $100.00 · your plan's default");
    expect(root).toHaveTextContent(
      "When your plan's credits run out, extra usage is billed at the end of the period, up to this limit.",
    );
    expect(root).toHaveTextContent("No extra usage yet");
    expect(screen.queryByRole("meter")).toBeNull();
    expect(screen.getByRole("button", { name: "Change limit" })).toHaveClass(
      "schematic-cta--ghost",
    );
    expect(
      screen.queryByRole("button", { name: "Reset to plan default" }),
    ).toBeNull();
  });

  test("the company's own limit, with usage past zero", () => {
    renderCard();
    const root = card();
    expect(root).toHaveTextContent("2,000 AI credits");
    expect(root).toHaveTextContent("About $40.00 · set by you");
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "62");
    expect(meter).not.toHaveClass("schematic-meter--warning");
    expect(root).toHaveTextContent("1,240 extra AI credits used · $24.80");
    expect(root).toHaveTextContent("760 left");
    expect(root).not.toHaveTextContent("When your plan's credits run out");
    expect(
      screen.getByRole("button", { name: "Reset to plan default" }),
    ).toBeInTheDocument();
  });

  test("warns near the limit", () => {
    renderCard(balances({ debt: 1720, overdraftLimit: 2000 }));
    expect(screen.getByRole("meter")).toHaveClass("schematic-meter--warning");
    expect(card()).toHaveTextContent(
      "You are close to your limit. Usage pauses at 2,000 extra AI credits.",
    );
    expect(screen.getByText("280 left")).toHaveClass(
      "schematic-overage-limit__warning",
    );
    expect(screen.getByRole("button", { name: "Change limit" })).toHaveClass(
      "schematic-cta--ghost",
    );
  });

  test("warnAt moves where the warning starts", () => {
    renderCard(balances({ debt: 1000, overdraftLimit: 2000 }), { warnAt: 50 });
    expect(screen.getByRole("meter")).toHaveClass("schematic-meter--warning");
  });

  test("at the limit, says extra usage is paused and when credits renew", () => {
    const { unmount } = renderCard(
      balances(
        { debt: 2000, overdraftLimit: 2000 },
        new Date("2026-12-13T12:00:00Z"),
      ),
    );
    expect(screen.getByRole("meter")).toHaveClass("schematic-meter--over");
    expect(card()).toHaveTextContent("0 left");
    expect(card()).toHaveTextContent(
      "Limit reached. Extra usage is paused until you raise the limit or your invoice for it is paid.",
    );
    expect(card()).toHaveTextContent("Your plan's credits renew on Dec 13.");
    expect(
      screen.getByRole("button", { name: "Change limit" }),
    ).not.toHaveClass("schematic-cta--ghost");
    unmount();

    renderCard(balances({ debt: 2000, overdraftLimit: 2000 }));
    expect(card()).toHaveTextContent(
      "Limit reached. Extra usage is paused until you raise the limit or your invoice for it is paid.",
    );
    expect(card()).not.toHaveTextContent("renew on");
  });

  test("the plan sets the limit and the company cannot change it", () => {
    renderCard(
      balances({ canChangeLimit: false, debt: 1240 }, new Date("2026-12-13")),
    );
    const root = card();
    expect(root).toHaveTextContent("About $100.00 · set by your plan");
    expect(root).toHaveTextContent("3,760 left");
    expect(root).toHaveTextContent("Your plan sets this limit.");
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("a provider's cap names the provider and bounds the form", () => {
    renderCard(
      balances({
        adminLimit: 1500,
        debt: 1240,
        limitSource: "admin",
        maxLimit: 1500,
        overdraftLimit: 1500,
      }),
    );
    expect(card()).toHaveTextContent("About $30.00 · set by your provider");
    expect(
      screen.queryByRole("button", { name: "Reset to plan default" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Change limit" }));
    expect(card()).toHaveTextContent(
      "Your provider allows up to 1,500 AI credits.",
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Limit" }), {
      target: { value: "2,000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(card()).toHaveTextContent("Enter 1,500 AI credits or fewer.");
  });

  test("a provider's cap that is reached does not offer to raise it", () => {
    renderCard(
      balances({
        adminLimit: 1500,
        debt: 1500,
        limitSource: "admin",
        maxLimit: 1500,
        overdraftLimit: 1500,
      }),
    );
    expect(card()).toHaveTextContent(
      "Limit reached. Extra usage is paused until your invoice for it is paid.",
    );
    expect(screen.getByRole("button", { name: "Change limit" })).toHaveClass(
      "schematic-cta--ghost",
    );
  });

  test("a provider's cap on a plan the company can't change", () => {
    renderCard(
      balances({
        adminLimit: 1500,
        canChangeLimit: false,
        limitSource: "admin",
        overdraftLimit: 1500,
      }),
    );
    expect(card()).toHaveTextContent("set by your provider");
    expect(card()).toHaveTextContent("Your provider sets this limit.");
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("a locked limit that is reached does not offer to raise it", () => {
    renderCard(
      balances(
        { canChangeLimit: false, debt: 5000 },
        new Date("2026-12-13T12:00:00Z"),
      ),
    );
    expect(card()).toHaveTextContent(
      "Limit reached. Extra usage is paused until your invoice for it is paid.",
    );
    expect(card()).toHaveTextContent("Your plan's credits renew on Dec 13.");
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("allowEdit false is read-only even where the plan allows changes", () => {
    renderCard(undefined, { allowEdit: false });
    expect(screen.queryByRole("button")).toBeNull();
    expect(card()).not.toHaveTextContent("Your plan sets this limit.");
  });

  test("showUsage false leaves out the meter and what was used", () => {
    renderCard(undefined, { showUsage: false });
    expect(screen.queryByRole("meter")).toBeNull();
    expect(card()).not.toHaveTextContent("extra AI credits used");
    expect(card()).toHaveTextContent("When your plan's credits run out");
  });

  test("no limit, with usage, counts what was used without a meter", () => {
    renderCard(
      balances({ debt: 300, overdraftLimit: null, planDefaultLimit: null }),
    );
    expect(card()).toHaveTextContent("No limit");
    expect(card()).toHaveTextContent("your plan's default");
    expect(card()).toHaveTextContent("300 extra AI credits used · $6.00");
    expect(screen.queryByRole("meter")).toBeNull();
    expect(card()).not.toHaveTextContent("left");
  });

  test("leaves the money out without a rate", () => {
    renderCard(
      balances({ postpaidRatePerUnit: null, postpaidRatePerUnitDecimal: null }),
    );
    expect(card()).not.toHaveTextContent("$");
    expect(card()).not.toHaveTextContent("About");
    expect(card()).toHaveTextContent("your plan's default");
  });

  test("renders nothing for a company with no such credit", () => {
    const { container, unmount } = renderCard({
      creditBalances: [creditBalance()],
    });
    expect(container).toBeEmptyDOMElement();
    unmount();

    const named = renderCard(undefined, { creditId: "bcr_export" });
    expect(named.container).toBeEmptyDOMElement();
  });

  test("renders nothing, and warns, for several and no creditId", () => {
    const warn = vi.mocked(console.warn).mockImplementationOnce(() => {});
    const data: BillingData = {
      creditBalances: [
        creditBalance({ creditId: "bcr_ai", overdraft: creditOverdraft() }),
        creditBalance({
          creditId: "bcr_img",
          creditName: "Image credit",
          overdraft: creditOverdraft({ creditId: "bcr_img" }),
        }),
      ],
    };
    const { container, unmount } = renderCard(data);
    expect(container).toBeEmptyDOMElement();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("several credits have an overage limit"),
    );
    unmount();

    renderCard(data, { creditId: "bcr_img" });
    expect(card()).toHaveTextContent("Image credit");
  });

  test("changes the limit in place, then reports it saved", async () => {
    const updateCreditOverdraft = vi.fn(async () => {});
    const onSaved = vi.fn();
    renderCard(undefined, { onSaved }, { actions: { updateCreditOverdraft } });

    fireEvent.click(screen.getByRole("button", { name: "Change limit" }));
    const input = screen.getByRole("textbox", { name: "Limit" });
    expect(input).toHaveValue("2,000");
    expect(input).toHaveFocus();
    expect(card()).toHaveTextContent(
      "About $40.00. Your plan allows up to 20,000 AI credits.",
    );
    fireEvent.change(input, { target: { value: "3,000" } });
    expect(card()).toHaveTextContent("About $60.00.");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(updateCreditOverdraft).toHaveBeenCalledWith("bcr_ai", {
      overdraftLimit: 3000,
    });
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  test("checks the limit before saving it", () => {
    const updateCreditOverdraft = vi.fn(async () => {});
    renderCard(undefined, undefined, { actions: { updateCreditOverdraft } });
    fireEvent.click(screen.getByRole("button", { name: "Change limit" }));
    const input = screen.getByRole("textbox", { name: "Limit" });

    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a number of AI credits above zero.",
    );
    expect(input).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(input, { target: { value: "25000" } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter 20,000 AI credits or fewer.",
    );
    expect(updateCreditOverdraft).not.toHaveBeenCalled();
  });

  test("shows the server's reason for a refused save in the form", async () => {
    const updateCreditOverdraft = vi.fn(async () => {
      throw new SchematicApiError(400, "/company/credits/bcr_ai/overdraft", {
        error: "The limit is above your plan's maximum.",
      });
    });
    const onSaved = vi.fn();
    renderCard(undefined, { onSaved }, { actions: { updateCreditOverdraft } });
    fireEvent.click(screen.getByRole("button", { name: "Change limit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const form = card().querySelector(
      ".schematic-overage-limit__form",
    ) as HTMLElement;
    expect(await within(form).findByRole("alert")).toHaveTextContent(
      "The limit is above your plan's maximum.",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  test("says a save failed when the server gives no reason", async () => {
    const updateCreditOverdraft = vi.fn(async () => {
      throw new Error("offline");
    });
    renderCard(undefined, undefined, { actions: { updateCreditOverdraft } });
    fireEvent.click(screen.getByRole("button", { name: "Change limit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your limit could not be saved.",
    );
  });

  test("returns to the plan's default from the form or the card", async () => {
    const resetCreditOverdraft = vi.fn(async () => {});
    const onSaved = vi.fn();
    const { unmount } = renderCard(
      undefined,
      { onSaved },
      { actions: { resetCreditOverdraft } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Change limit" }));
    fireEvent.click(screen.getByRole("button", { name: "Use plan default" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(resetCreditOverdraft).toHaveBeenCalledWith("bcr_ai");
    expect(screen.queryByRole("textbox")).toBeNull();
    unmount();

    renderCard(undefined, { onSaved }, { actions: { resetCreditOverdraft } });
    fireEvent.click(
      screen.getByRole("button", { name: "Reset to plan default" }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(2));
  });

  test("says a reset from the card failed", async () => {
    const resetCreditOverdraft = vi.fn(async () => {
      throw new Error("offline");
    });
    renderCard(undefined, undefined, { actions: { resetCreditOverdraft } });
    fireEvent.click(
      screen.getByRole("button", { name: "Reset to plan default" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your limit could not be reset.",
    );
  });

  test("cancel leaves the limit as it was", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Change limit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Limit" }), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(card()).toHaveTextContent("2,000 AI credits");
  });

  test("offers no plan default from the form when it is already in force", () => {
    renderCard(balances());
    fireEvent.click(screen.getByRole("button", { name: "Change limit" }));
    expect(
      screen.queryByRole("button", { name: /Use plan default/ }),
    ).toBeNull();
  });

  test("says the limit is unavailable on a 404, and retries otherwise", () => {
    const { unmount } = renderCard({}, undefined, {
      status: {
        creditBalances: {
          error: new SchematicApiError(404, "/company/credits", null),
        },
      },
    });
    expect(
      screen.getByText("Your overage limit is not available for this account."),
    ).toBeInTheDocument();
    unmount();

    renderCard({}, undefined, {
      status: { creditBalances: { error: new Error("boom") } },
    });
    expect(
      screen.getByText("There was a problem retrieving your overage limit."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  test("takes the host's copy and heading level", () => {
    renderCard(undefined, {
      headingLevel: 3,
      strings: { overageLimitHeader: "Spending cap" },
    });
    expect(
      screen.getByRole("heading", { level: 3, name: "Spending cap" }),
    ).toBeInTheDocument();
  });
});
