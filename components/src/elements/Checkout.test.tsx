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
import { cardPaymentMethod } from "./fixtures/builders";
import {
  catalog,
  catalogAddOn,
  catalogPlan,
  checkoutDraft,
  company,
  companyOn,
  creditBundle,
  payInAdvanceEntitlement,
  priceSnapshot,
  problem,
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

function fakeActions(overrides: Partial<BillingActions> = {}) {
  let version = 0;
  const priced = (selections: CheckoutSelections) =>
    checkoutDraft({
      id: "chk_1",
      priceSnapshot: priceSnapshot({ paymentMethodRequired: false }),
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
