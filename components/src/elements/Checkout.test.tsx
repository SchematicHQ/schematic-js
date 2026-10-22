import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingActions,
  type BillingData,
  type CheckoutResult,
  type CheckoutSelections,
} from "@schematichq/schematic-react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { vi } from "vitest";

import { Checkout, type CheckoutProps } from "./Checkout";
import type { PaymentMethodFormProps } from "./PaymentMethodForm";
import { cardPaymentMethod, daysFromNow } from "./fixtures/builders";
import {
  autoTopup,
  catalog,
  catalogAddOn,
  catalogPlan,
  checkoutDraft,
  company,
  companyOn,
  creditBundle,
  monthly,
  oneTime,
  payInAdvanceEntitlement,
  priceSnapshot,
  problem,
  prorationDetail,
  prorationLine,
} from "./fixtures/checkout";

vi.mock("./PaymentMethodForm", () => ({
  default: ({ onSaved }: PaymentMethodFormProps) => (
    <div data-testid="payment-method-form">
      <button type="button" onClick={() => void onSaved("pm_new")}>
        fake save
      </button>
    </div>
  ),
}));

const stripe = vi.hoisted(() => ({
  confirmPayment: vi.fn(async () => undefined),
  loadStripeForIntent: vi.fn(async () => ({})),
}));
vi.mock("./stripe", () => stripe);

const seats = payInAdvanceEntitlement();
const starter = catalogPlan({ name: "Starter", current: true });
const pro = catalogPlan({ entitlements: [seats], name: "Pro" });
const addOn = catalogAddOn({ name: "Support" });
const bundle = creditBundle();
const card = cardPaymentMethod({ isDefault: true });
const charged = {
  id: "bilsub_1",
  status: "active",
} as unknown as CheckoutResult;

function fakeActions(
  overrides: Partial<BillingActions> = {},
  snapshot = priceSnapshot({ paymentMethodRequired: false }),
) {
  let version = 0;
  const priced = (selections: CheckoutSelections) =>
    checkoutDraft({
      id: "chk_1",
      priceSnapshot: snapshot,
      selections: {
        addOnIds: selections.addOns ?? [],
        autoTopupOverrides: [],
        creditBundles: selections.creditBundles ?? [],
        customFieldValues: [],
        intent: "change",
        newPlanId: selections.planId,
        payInAdvance: selections.payInAdvance ?? [],
        skipTrial: selections.skipTrial ?? false,
      },
      version: ++version,
    });
  return {
    createCheckout: vi.fn(async (selections: CheckoutSelections) => ({
      checkout: priced(selections),
    })),
    updateCheckout: vi.fn(
      async (
        _id: string,
        _version: number,
        selections: CheckoutSelections,
      ) => ({
        checkout: priced(selections),
        sessionId: "cs_1",
      }),
    ),
    getCheckout: vi.fn(async () => checkoutDraft({ id: "chk_1", version })),
    finalizeCheckout: vi.fn(async () => charged),
    createSetupIntent: vi.fn(async () => ({
      schematicPublishableKey: "pk",
      setupIntentClientSecret: "seti",
    })) as unknown as BillingActions["createSetupIntent"],
    ...overrides,
  };
}

const baseData = (): BillingData => ({
  catalog: catalog({
    addOns: [addOn],
    creditBundles: [bundle],
    plans: [starter, pro],
  }),
  company: companyOn(starter),
  featureUsage: [],
  paymentMethods: [card],
});

function renderCheckout(
  props: Partial<CheckoutProps> = {},
  data: BillingData = baseData(),
  actions = fakeActions(),
) {
  const onOpenChange = vi.fn();
  const onComplete = vi.fn();
  render(
    <BillingDataProvider actions={actions} data={data}>
      <Checkout
        locale="en-US"
        open
        onComplete={onComplete}
        onOpenChange={onOpenChange}
        {...props}
      />
    </BillingDataProvider>,
  );
  return { actions, onComplete, onOpenChange };
}

const dialog = () => document.querySelector("dialog") as HTMLDialogElement;
const step = () =>
  dialog()
    .querySelector(".schematic-checkout__layout")
    ?.getAttribute("data-step");
const cards = () => screen.getAllByTestId("schematic-checkout-card");
const next = () => screen.getByTestId("schematic-checkout-next");
const finalizeButton = () => screen.getByTestId("schematic-checkout-finalize");

describe("Checkout", () => {
  test("renders nothing while closed", () => {
    render(
      <BillingDataProvider data={baseData()}>
        <Checkout open={false} onOpenChange={() => {}} />
      </BillingDataProvider>,
    );
    expect(document.querySelector("dialog")).toBeNull();
  });

  test("opens on the company's plan and prices it", async () => {
    const { actions } = renderCheckout();
    expect(step()).toBe("plan");
    expect(
      cards().map((c) => within(c).getByRole("heading").textContent),
    ).toEqual(["Starter", "Pro"]);
    expect(within(cards()[0]).getByText("Current plan")).toBeInTheDocument();
    expect(
      within(cards()[0]).getByRole("button", { name: "Selected" }),
    ).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(actions.createCheckout).toHaveBeenCalledTimes(1),
    );
    expect(actions.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethodId: card.externalId,
        planId: starter.id,
        priceId: starter.monthlyPrice?.id,
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("schematic-checkout-summary"),
      ).toHaveTextContent("Due today$25.00"),
    );
  });

  test("re-prices when the plan changes, and walks to its quantities", async () => {
    const { actions } = renderCheckout();
    await waitFor(() => expect(actions.createCheckout).toHaveBeenCalled());
    fireEvent.click(within(cards()[1]).getByRole("button", { name: "Select" }));
    await waitFor(() =>
      expect(actions.updateCheckout).toHaveBeenCalledWith(
        "chk_1",
        1,
        expect.objectContaining({
          payInAdvance: [
            { priceId: seats.meteredMonthlyPrice?.id, quantity: 1 },
          ],
          planId: pro.id,
        }),
      ),
    );
    fireEvent.click(next());
    expect(step()).toBe("usage");
    fireEvent.change(screen.getByLabelText("Quantity of Seat"), {
      target: { value: "4" },
    });
    await waitFor(() =>
      expect(actions.updateCheckout).toHaveBeenLastCalledWith(
        "chk_1",
        expect.any(Number),
        expect.objectContaining({
          payInAdvance: [
            { priceId: seats.meteredMonthlyPrice?.id, quantity: 4 },
          ],
        }),
      ),
    );
  });

  test("finalizes with the card on file and closes", async () => {
    const { actions, onComplete, onOpenChange } = renderCheckout({
      steps: { skip: ["plan", "addOns", "credits"] },
    });
    expect(step()).toBe("payment");
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
    expect(finalizeButton()).toHaveTextContent("Pay now");
    fireEvent.click(finalizeButton());
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(charged));
    expect(actions.finalizeCheckout).toHaveBeenCalledWith("chk_1", 1, {});
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(stripe.confirmPayment).not.toHaveBeenCalled();
  });

  test("holds the charge while a new card is entered, then pays with it", async () => {
    const saved = cardPaymentMethod({
      cardLast4: "3184",
      externalId: "pm_new",
    });
    const actions = fakeActions({
      setDefaultPaymentMethod: vi.fn(async () => undefined),
    });
    renderCheckout(
      { steps: { initial: "payment" } },
      { ...baseData(), paymentMethods: [card, saved] },
      actions,
    );
    await waitFor(() => expect(finalizeButton()).toBeEnabled());

    fireEvent.click(screen.getByText("Use a different payment method"));
    await screen.findByTestId("payment-method-form");
    expect(finalizeButton()).toBeDisabled();

    fireEvent.click(screen.getByText("fake save"));
    await waitFor(() =>
      expect(screen.queryByTestId("payment-method-form")).toBeNull(),
    );
    expect(actions.setDefaultPaymentMethod).toHaveBeenCalledWith("pm_new");
    expect(dialog()).toHaveTextContent("3184");
    await waitFor(() =>
      expect(
        vi.mocked(actions.updateCheckout).mock.lastCall?.[2],
      ).toMatchObject({ paymentMethodId: "pm_new" }),
    );
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
  });

  test("confirms a payment that needs the customer before it completes", async () => {
    const actions = fakeActions({
      finalizeCheckout: vi.fn(async () => ({
        ...charged,
        confirmPaymentIntentClientSecret: "pi_secret",
      })),
    });
    const { onComplete } = renderCheckout(
      { steps: { initial: "payment" } },
      baseData(),
      actions,
    );
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
    fireEvent.click(finalizeButton());
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(stripe.confirmPayment).toHaveBeenCalledWith(
      expect.anything(),
      "pi_secret",
    );
  });

  test("shows a refused finalize's problems on the step that can fix them", async () => {
    const actions = fakeActions({
      finalizeCheckout: vi.fn(async () => {
        throw new SchematicApiError(400, "/checkouts/chk_1/finalize", {
          error: "Choose how many seats.",
          problems: [
            {
              blocking: true,
              code: "pay_in_advance_required",
              message: "Choose how many seats.",
              source: "validation",
            },
          ],
        });
      }),
      // The row read back after the refusal: the list is the refusal's.
      getCheckout: vi.fn(async () =>
        checkoutDraft({ id: "chk_1", version: 3 }),
      ),
    });
    renderCheckout(
      { selection: { planId: pro.id }, steps: { initial: "payment" } },
      baseData(),
      actions,
    );
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
    fireEvent.click(finalizeButton());
    await waitFor(() => expect(step()).toBe("usage"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose how many seats.",
    );
  });

  test("buys credit bundles alone when no plan is chosen", async () => {
    const data = baseData();
    const { actions } = renderCheckout(
      {
        selection: { creditBundles: { [bundle.id]: 2 }, planId: null },
        steps: { initial: "credits" },
      },
      { ...data, company: company() },
    );
    expect(step()).toBe("credits");
    await waitFor(() =>
      expect(actions.createCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          creditBundles: [{ bundleId: bundle.id, quantity: 2 }],
        }),
      ),
    );
    expect(
      vi.mocked(actions.createCheckout).mock.calls[0][0],
    ).not.toHaveProperty("planId");
  });

  test("uses the host's words for a problem", async () => {
    const actions = fakeActions({
      createCheckout: vi.fn(async () => ({
        checkout: checkoutDraft({
          id: "chk_1",
          problems: [problem({ code: "plan_unavailable" })],
        }),
      })),
    });
    renderCheckout(
      {
        formatProblem: (p) =>
          p.code === "plan_unavailable" ? "Pick another plan" : undefined,
      },
      baseData(),
      actions,
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Pick another plan"),
    );
  });

  test("says checkout is not available when the company cannot buy", () => {
    renderCheckout(
      {},
      {
        ...baseData(),
        catalog: catalog({
          capabilities: { badgeVisibility: false, checkout: false },
          plans: [starter],
        }),
      },
    );
    expect(dialog()).toHaveTextContent(
      "Checkout is not available for this account.",
    );
  });

  test("stacks the summary under the steps when asked", () => {
    renderCheckout({ display: { layout: "stacked" } });
    expect(dialog().className).toBe(
      "schematic-dialog schematic-checkout schematic-checkout--stacked",
    );
  });

  test("holds the summary for the payment step when asked", async () => {
    const { actions } = renderCheckout({ display: { summary: "payment" } });
    expect(step()).toBe("plan");
    expect(
      dialog().querySelector(".schematic-checkout__layout"),
    ).toHaveAttribute("data-summary", "payment");
    expect(screen.queryByTestId("schematic-checkout-summary")).toBeNull();
    expect(next().closest(".schematic-checkout__nav")).not.toBeNull();
    await waitFor(() => expect(actions.createCheckout).toHaveBeenCalled());
    while (screen.queryByTestId("schematic-checkout-finalize") === null) {
      fireEvent.click(next());
    }
    expect(step()).toBe("payment");
    expect(screen.getByTestId("schematic-checkout-summary")).toContainElement(
      finalizeButton(),
    );
    expect(dialog().querySelector(".schematic-checkout__nav")).not.toContain(
      finalizeButton(),
    );
  });

  test("closes from its close control", () => {
    const { onOpenChange } = renderCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Checkout proration", () => {
  const itemized = (overrides = {}) =>
    prorationDetail({
      lines: [
        prorationLine({ planId: starter.id }),
        prorationLine({ amount: 2500, kind: "charge", planId: pro.id }),
      ],
      ...overrides,
    });
  const summary = () => screen.getByTestId("schematic-checkout-summary");

  test("itemizes the proration behind a toggle", async () => {
    renderCheckout(
      {},
      baseData(),
      fakeActions(
        {},
        priceSnapshot({
          paymentMethodRequired: false,
          proration: 1250,
          prorationDetail: itemized(),
        }),
      ),
    );
    await waitFor(() => expect(summary()).toHaveTextContent("Proration"));
    const toggle = within(summary()).getByRole("button", {
      name: "Show details",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(summary()).toHaveTextContent("$12.50");
    expect(summary()).not.toHaveTextContent("Unused time on Starter");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(summary()).toHaveTextContent("Unused time on Starter");
    expect(summary()).toHaveTextContent("-$12.50");
    expect(summary()).toHaveTextContent("Remaining time on Pro");
    expect(summary()).toHaveTextContent("$25.00");
    expect(
      within(summary()).getByRole("button", { name: "Hide details" }),
    ).toBeInTheDocument();
  });

  test("says when the proration is billed on the next invoice", async () => {
    renderCheckout(
      {},
      baseData(),
      fakeActions(
        {},
        priceSnapshot({
          dueNow: 0,
          paymentMethodRequired: false,
          proration: 1250,
          prorationDetail: itemized({
            billedAt: daysFromNow(30),
            timing: "at_renewal",
          }),
        }),
      ),
    );
    await waitFor(() =>
      expect(summary()).toHaveTextContent(
        /Prorated changes are billed on your next invoice, September \d+, 2026\./,
      ),
    );
  });

  test("shows one proration line when the server does not itemize it", async () => {
    renderCheckout(
      {},
      baseData(),
      fakeActions(
        {},
        priceSnapshot({ paymentMethodRequired: false, proration: -1200 }),
      ),
    );
    await waitFor(() =>
      expect(summary()).toHaveTextContent("Proration-$12.00"),
    );
    expect(
      within(summary()).queryByRole("button", { name: /details/ }),
    ).toBeNull();
  });
});

describe("Checkout credit", () => {
  const summary = () => screen.getByTestId("schematic-checkout-summary");
  const payment = { steps: { skip: ["plan", "addOns", "credits"] } } as const;

  test("deducts the credit the company holds from what is due", async () => {
    renderCheckout(
      payment,
      baseData(),
      fakeActions(
        {},
        priceSnapshot({ customerBalanceApplied: 904, dueNow: 1596 }),
      ),
    );
    await waitFor(() =>
      expect(summary()).toHaveTextContent("Credit applied-$9.04"),
    );
    expect(summary()).toHaveTextContent("Due today$15.96");
    expect(finalizeButton()).toHaveTextContent("Pay now");
  });

  test("says what a change worth more than its charges leaves in credit", async () => {
    renderCheckout(
      payment,
      baseData(),
      fakeActions(
        {},
        priceSnapshot({
          customerBalanceRemaining: 2500,
          dueNow: 0,
          paymentMethodRequired: false,
          proration: -5000,
        }),
      ),
    );
    await waitFor(() =>
      expect(summary()).toHaveTextContent(
        "$25.00 in credit will be applied to your future invoices.",
      ),
    );
    expect(summary()).toHaveTextContent("Due today$0.00");
    expect(finalizeButton()).toHaveTextContent("Confirm");
  });
});

describe("Checkout after a refused re-price", () => {
  const summary = () => screen.getByTestId("schematic-checkout-summary");
  const payment = { steps: { skip: ["plan", "addOns", "credits"] } } as const;

  // The server refuses BOGUS: the draft comes back with the problem and no
  // snapshot, as it does for a cart it cannot price.
  function refusingBogus(snapshot = priceSnapshot()) {
    const actions = fakeActions({}, snapshot);
    const priced = actions.updateCheckout;
    actions.updateCheckout = vi.fn(
      async (id: string, version: number, selections: CheckoutSelections) =>
        selections.promoCode === "BOGUS"
          ? {
              checkout: checkoutDraft({
                id: "chk_1",
                priceSnapshot: undefined,
                problems: [
                  problem({
                    code: "selection_invalid",
                    message: "Invalid promo code",
                    source: "validation",
                  }),
                ],
                version: version + 1,
              }),
            }
          : priced(id, version, selections),
    );
    return actions;
  }

  const applyPromo = (code: string) => {
    fireEvent.change(screen.getByLabelText("Promo code"), {
      target: { value: code },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  };

  test("keeps saying Pay now while the price is unknown", async () => {
    renderCheckout(payment, baseData(), refusingBogus());
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
    expect(finalizeButton()).toHaveTextContent("Pay now");

    applyPromo("BOGUS");
    await screen.findByText("Invalid promo code");
    expect(finalizeButton()).toBeDisabled();
    expect(finalizeButton()).toHaveTextContent("Pay now");
  });

  test("keeps the proration details open across it", async () => {
    renderCheckout(
      payment,
      baseData(),
      refusingBogus(
        priceSnapshot({
          proration: 1250,
          prorationDetail: prorationDetail({
            lines: [
              prorationLine({ planId: starter.id }),
              prorationLine({ amount: 2500, kind: "charge", planId: pro.id }),
            ],
          }),
        }),
      ),
    );
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
    fireEvent.click(
      within(summary()).getByRole("button", { name: "Show details" }),
    );
    expect(summary()).toHaveTextContent("Unused time on Starter");

    applyPromo("BOGUS");
    await screen.findByText("Invalid promo code");
    expect(summary()).not.toHaveTextContent("Proration");

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(summary()).toHaveTextContent("Proration"));
    expect(
      within(summary()).getByRole("button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(summary()).toHaveTextContent("Unused time on Starter");
  });
});

describe("Checkout one-time charges", () => {
  const summary = () => screen.getByTestId("schematic-checkout-summary");

  test("groups what is charged once after what renews", async () => {
    const setup = catalogAddOn({
      chargeType: "one_time",
      monthlyPrice: undefined,
      name: "Onboarding",
      oneTimePrice: oneTime(9900),
      yearlyPrice: undefined,
    });
    renderCheckout(
      {
        selection: {
          addOnIds: [setup.id],
          creditBundles: { [bundle.id]: 2 },
        },
        steps: { initial: "payment" },
      },
      {
        ...baseData(),
        catalog: catalog({
          addOns: [addOn, setup],
          creditBundles: [bundle],
          plans: [starter, pro],
        }),
      },
    );
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
    const recurring = summary().querySelector(
      ".schematic-checkout__lines:not(.schematic-checkout__lines--one-time)",
    );
    const once = summary().querySelector(
      ".schematic-checkout__lines--one-time",
    );
    expect(recurring).toHaveTextContent("Starter$25.00");
    expect(recurring).not.toHaveTextContent("Onboarding");
    expect(summary()).toHaveTextContent("One-time");
    expect(once).toHaveTextContent("Onboarding$99.00");
    expect(once).toHaveTextContent("2 × 100 credits$20.00");
    expect(once?.querySelectorAll(".schematic-checkout__line--one-time")).toHaveLength(2);
  });

  test("marks a one-time add-on's price on its card", async () => {
    const setup = catalogAddOn({
      chargeType: "one_time",
      monthlyPrice: undefined,
      name: "Onboarding",
      oneTimePrice: oneTime(9900),
      yearlyPrice: undefined,
    });
    renderCheckout(
      { steps: { initial: "addOns" } },
      {
        ...baseData(),
        catalog: catalog({ addOns: [setup], plans: [starter, pro] }),
      },
    );
    const card = cards().find(
      (c) => within(c).getByRole("heading").textContent === "Onboarding",
    ) as HTMLElement;
    expect(card).toHaveTextContent("$99.00 one time");
  });
});

describe("Checkout in the page", () => {
  test("renders inline when asked, without the dialog", async () => {
    const { actions } = renderCheckout({ display: { container: "inline" } });
    expect(document.querySelector("dialog")).toBeNull();
    const root = screen.getByRole("region", { name: "Checkout" });
    expect(root.tagName).toBe("SECTION");
    expect(root.className).toBe("schematic-checkout schematic-checkout--inline");
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    expect(
      root.querySelector(".schematic-checkout__layout"),
    ).toHaveAttribute("data-step", "plan");
    await waitFor(() => expect(actions.createCheckout).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.getByTestId("schematic-checkout-summary"),
      ).toHaveTextContent("Due today$25.00"),
    );
  });

  test("renders nothing inline while closed", () => {
    render(
      <BillingDataProvider data={baseData()}>
        <Checkout
          display={{ container: "inline" }}
          open={false}
          onOpenChange={() => {}}
        />
      </BillingDataProvider>,
    );
    expect(document.querySelector(".schematic-checkout")).toBeNull();
  });

  test("stacks inline too", () => {
    renderCheckout({ display: { container: "inline", layout: "stacked" } });
    expect(screen.getByRole("region", { name: "Checkout" }).className).toBe(
      "schematic-checkout schematic-checkout--inline schematic-checkout--stacked",
    );
  });
});

describe("Checkout period and currency choices", () => {
  test("says what a longer period saves while it is not chosen", async () => {
    renderCheckout();
    expect(
      screen.getByText("Save 17% with yearly billing"),
    ).toHaveClass("schematic-checkout__savings");
    fireEvent.click(screen.getByRole("button", { name: "Yearly" }));
    expect(screen.queryByText(/with yearly billing/)).toBeNull();
  });

  test("keeps the currency choice on the first step when the plan step is skipped", async () => {
    const eur = { currency: "eur", monthlyPrice: monthly(2300, "eur") };
    const data = {
      ...baseData(),
      catalog: catalog({
        addOns: [addOn],
        plans: [
          catalogPlan({ ...starter, currencyPrices: [eur] }),
          catalogPlan({ ...pro, currencyPrices: [eur] }),
        ],
      }),
      // No subscription, so nothing fixes the currency.
      company: company(),
    };
    const { actions } = renderCheckout({ steps: { skip: ["plan"] } }, data);
    expect(step()).toBe("addOns");
    const select = screen.getByLabelText("Currency");
    expect(select).toHaveValue("usd");
    await waitFor(() => expect(actions.createCheckout).toHaveBeenCalled());
    fireEvent.change(select, { target: { value: "eur" } });
    await waitFor(() =>
      expect(actions.updateCheckout).toHaveBeenLastCalledWith(
        "chk_1",
        expect.any(Number),
        expect.objectContaining({ currency: "eur", priceId: eur.monthlyPrice.id }),
      ),
    );
  });

  test("offers no currency choice off the plan step once a subscription fixes it", () => {
    renderCheckout({ steps: { skip: ["plan"] } });
    expect(step()).toBe("addOns");
    expect(screen.queryByLabelText("Currency")).toBeNull();
  });
});

describe("Checkout steps and fields", () => {
  test("starts each step at its top", async () => {
    // jsdom has no scrollTo; the element only calls one that exists.
    const scrollTo = vi.fn();
    const proto = HTMLElement.prototype as { scrollTo?: unknown };
    const had = proto.scrollTo;
    proto.scrollTo = scrollTo;
    try {
      const { actions } = renderCheckout();
      await waitFor(() => expect(actions.createCheckout).toHaveBeenCalled());
      fireEvent.click(
        within(cards()[1]).getByRole("button", { name: "Select" }),
      );
      scrollTo.mockClear();
      fireEvent.click(next());
      expect(step()).toBe("usage");
      const scrolled = scrollTo.mock.contexts as HTMLElement[];
      expect(
        scrolled.some((el) => el.classList.contains("schematic-checkout__main")),
      ).toBe(true);
      expect(scrolled.some((el) => el.tagName === "DIALOG")).toBe(true);
      expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    } finally {
      proto.scrollTo = had;
    }
  });

  test("keeps a top-up's amount whole and at least one", async () => {
    const topup = autoTopup({ planCreditGrantId: "pcg_1" });
    const data = baseData();
    const { actions } = renderCheckout(
      { steps: { initial: "autoTopup" } },
      {
        ...data,
        catalog: catalog({
          plans: [
            catalogPlan({ ...starter, autoTopups: [topup] }),
            pro,
          ],
        }),
      },
    );
    expect(step()).toBe("autoTopup");
    await waitFor(() => expect(actions.createCheckout).toHaveBeenCalled());
    const amount = screen.getByLabelText("Buy");
    const sent = () =>
      vi.mocked(actions.updateCheckout).mock.lastCall?.[2].autoTopupOverrides;

    fireEvent.change(amount, { target: { value: "" } });
    expect(amount).toHaveValue(null);
    fireEvent.change(amount, { target: { value: "0" } });
    await waitFor(() =>
      expect(sent()).toEqual([
        expect.objectContaining({ autoTopupAmount: 1, planCreditGrantId: "pcg_1" }),
      ]),
    );
    fireEvent.change(amount, { target: { value: "2.7" } });
    await waitFor(() =>
      expect(sent()).toEqual([
        expect.objectContaining({ autoTopupAmount: 2 }),
      ]),
    );
    fireEvent.blur(amount);
    expect(amount).toHaveValue(2);
  });

  test("links the agreement's Markdown links", async () => {
    renderCheckout(
      { steps: { initial: "payment" } },
      baseData(),
      fakeActions(
        {},
        priceSnapshot({
          optInRequired: true,
          optInText: "I agree to the [terms](https://acme.test/terms).",
          optInTitle: "Terms",
        }),
      ),
    );
    const link = await screen.findByRole("link", { name: "terms" });
    expect(link).toHaveAttribute("href", "https://acme.test/terms");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.closest(".schematic-checkout__opt-in-text")).toHaveTextContent(
      "I agree to the terms.",
    );
  });
});

describe("Checkout plans the company may not choose", () => {
  test("ends the cards with the catalog's custom plan as a link to ask", async () => {
    renderCheckout(
      {},
      {
        ...baseData(),
        catalog: catalog({
          customPlanCta: {
            ctaText: "Talk to sales",
            ctaUrl: "https://acme.test/sales",
            priceText: "Let's talk",
          },
          plans: [starter, pro],
        }),
      },
    );
    const custom = cards()[2];
    expect(custom).toHaveClass("schematic-checkout__card--custom");
    expect(within(custom).getByRole("heading")).toHaveTextContent(
      "Custom plan",
    );
    expect(custom).toHaveTextContent("Let's talk");
    const link = within(custom).getByRole("link", { name: "Talk to sales" });
    expect(link).toHaveAttribute("href", "https://acme.test/sales");
    expect(link).toHaveAttribute("target", "_blank");
    expect(within(custom).queryByRole("button")).toBeNull();
  });

  test("says which features a plan is over the limit for", () => {
    const over = catalogPlan({
      invalidReason: "feature_usage_exceeded",
      name: "Lite",
      usageViolations: [
        { featureId: "f1", featureName: "Seats", limit: 5, usage: 8 },
        { featureId: "f2", featureName: "Projects", usage: 3 },
      ],
      valid: false,
    });
    renderCheckout(
      {},
      { ...baseData(), catalog: catalog({ plans: [starter, over] }) },
    );
    const card = cards()[1];
    expect(card).toHaveTextContent("Over the plan limit for Seats, Projects");
    expect(within(card).getByRole("button", { name: "Select" })).toBeDisabled();
  });

  test("links a blocked downgrade to where the catalog says to ask", () => {
    const lite = catalogPlan({
      invalidReason: "downgrade_not_permitted",
      name: "Lite",
      valid: false,
    });
    renderCheckout(
      {},
      {
        ...baseData(),
        catalog: catalog({
          plans: [starter, lite],
          preventSelfServiceDowngrade: true,
          preventSelfServiceDowngradeUrl: "https://acme.test/support",
        }),
      },
    );
    const card = cards()[1];
    expect(card).toHaveTextContent("Downgrade not permitted");
    const link = within(card).getByRole("link", { name: "Talk to us" });
    expect(link).toHaveAttribute("href", "https://acme.test/support");
    expect(link).toHaveClass("schematic-checkout__card-link");
  });
});

describe("Checkout payment methods on file", () => {
  test("lists the other methods on file and switches to one", async () => {
    const other = cardPaymentMethod({
      cardLast4: "1881",
      externalId: "pm_other",
    });
    const { actions } = renderCheckout(
      { steps: { initial: "payment" } },
      { ...baseData(), paymentMethods: [card, other] },
    );
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
    const list = screen.getByRole("list", {
      name: "Other payment methods on file",
    });
    expect(list).toHaveTextContent("1881");
    expect(list).not.toHaveTextContent(card.cardLast4 as string);

    fireEvent.click(within(list).getByRole("button", { name: "Use" }));
    await waitFor(() =>
      expect(
        vi.mocked(actions.updateCheckout).mock.lastCall?.[2],
      ).toMatchObject({ paymentMethodId: "pm_other" }),
    );
    expect(
      dialog().querySelector(".schematic-payment-methods__current"),
    ).toHaveTextContent("1881");
    expect(
      screen.getByRole("list", { name: "Other payment methods on file" }),
    ).toHaveTextContent(card.cardLast4 as string);
    expect(screen.queryByTestId("payment-method-form")).toBeNull();
  });

  test("lists nothing under the only method on file", async () => {
    renderCheckout({ steps: { initial: "payment" } });
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
    expect(
      screen.queryByRole("list", { name: "Other payment methods on file" }),
    ).toBeNull();
  });
});
