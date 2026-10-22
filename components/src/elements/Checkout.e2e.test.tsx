import { SchematicBillingClient } from "@schematichq/schematic-js";
import { SchematicProvider } from "@schematichq/schematic-react";
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
  catalogPlan,
  companyOn,
  creditBundle,
  monthly,
  payInAdvanceEntitlement,
} from "./fixtures/checkout";
import {
  fakeBillingServer,
  type FakeServerOptions,
  type Seen,
} from "./fixtures/server";

const stripe = vi.hoisted(() => ({
  confirmPayment: vi.fn(async () => undefined),
  loadStripeForIntent: vi.fn(async () => ({})),
}));
vi.mock("./stripe", () => stripe);
// The card form is Stripe's; here it saves a card the fake server then knows.
vi.mock("./PaymentMethodForm", () => ({
  default: ({ onSaved }: PaymentMethodFormProps) => (
    <button type="button" onClick={() => void onSaved("pm_new")}>
      fake save
    </button>
  ),
}));

/**
 * The whole stack with fetch faked at the network edge: wire JSON through the
 * schematic-js client, its CheckoutDraft and the schematic-react hooks to the
 * DOM, on the in-memory server the harness runs on too. The price here is
 * simply the plan's, so the figures below are the catalog's.
 */

const starter = catalogPlan({ current: true, name: "Starter" });
const pro = catalogPlan({ name: "Pro" });
const bundle = creditBundle();
const card = cardPaymentMethod({ isDefault: true });

type ServerOptions = Partial<
  Pick<
    FakeServerOptions,
    | "catalog"
    | "company"
    | "confirmSecret"
    | "conflictOnce"
    | "paymentMethods"
    | "refuse"
  >
> & {
  /** The server's own pricing, prorations and all, in place of the plan's price. */
  priced?: boolean;
};

function serve(options: ServerOptions = {}) {
  const { priced, ...rest } = options;
  const server = fakeBillingServer({
    catalog: catalog({ creditBundles: [bundle], plans: [starter, pro] }),
    company: companyOn(starter),
    paymentMethods: [card],
    price: priced
      ? undefined
      : (wire) => {
          const due =
            [starter, pro].find((p) => p.id === wire.new_plan_id)?.monthlyPrice
              ?.price ?? 0;
          return {
            dueNow: due,
            paymentMethodRequired: false,
            totalPerBillingPeriod: due,
          };
        },
    ...rest,
  });
  const fetchImpl = vi.fn(server.fetch);
  return { fetchImpl: fetchImpl as unknown as typeof fetch, seen: server.seen };
}

function renderStack(
  props: Partial<CheckoutProps> = {},
  options: ServerOptions = {},
) {
  const { fetchImpl, seen } = serve(options);
  const client = new SchematicBillingClient({
    apiUrl: "https://api.test",
    fetch: fetchImpl,
    session: { company: "co_test", token: "tok" },
  });
  const onComplete = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <SchematicProvider billingClient={client} publishableKey="pk_test">
      <Checkout
        locale="en-US"
        open
        onComplete={onComplete}
        onOpenChange={onOpenChange}
        {...props}
      />
    </SchematicProvider>,
  );
  return { onComplete, onOpenChange, seen };
}

const writes = (seen: Seen[]) =>
  seen
    .filter((s) => s.path.startsWith("/checkouts"))
    .map((s) => `${s.method} ${s.path}`);
const cardNamed = (name: string) =>
  screen
    .getAllByTestId("schematic-checkout-card")
    .find(
      (c) => within(c).getByRole("heading").textContent === name,
    ) as HTMLElement;

describe("Checkout end to end", () => {
  test("changes plan and finalizes under the session the last price handed out", async () => {
    const { onComplete, seen } = renderStack();
    await waitFor(() => expect(writes(seen)).toEqual(["POST /checkouts"]));

    fireEvent.click(
      within(await waitFor(() => cardNamed("Pro"))).getByRole("button", {
        name: "Select",
      }),
    );
    await waitFor(() =>
      expect(writes(seen)).toEqual([
        "POST /checkouts",
        "PUT /checkouts/chk_e2e",
      ]),
    );
    expect(seen[seen.length - 1]?.body).toMatchObject({
      new_plan_id: pro.id,
      version: 1,
    });

    // Past the credits step to payment.
    while (screen.queryByTestId("schematic-checkout-finalize") === null) {
      fireEvent.click(screen.getByTestId("schematic-checkout-next"));
    }
    const finalize = screen.getByTestId("schematic-checkout-finalize");
    await waitFor(() => expect(finalize).toBeEnabled());
    fireEvent.click(finalize);
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const finalized = seen.find(
      (s) => s.path === "/checkouts/chk_e2e/finalize",
    );
    expect(finalized).toMatchObject({ body: { version: 2 }, session: "cs_1" });
  });

  test("replays a write on the current version after another writer moved it", async () => {
    const { seen } = renderStack({}, { conflictOnce: true });
    await waitFor(() => expect(writes(seen)).toEqual(["POST /checkouts"]));
    fireEvent.click(
      within(await waitFor(() => cardNamed("Pro"))).getByRole("button", {
        name: "Select",
      }),
    );
    await waitFor(() =>
      expect(writes(seen)).toEqual([
        "POST /checkouts",
        "PUT /checkouts/chk_e2e",
        "GET /checkouts/chk_e2e",
        "PUT /checkouts/chk_e2e",
      ]),
    );
    expect(seen[seen.length - 1]?.body).toMatchObject({ version: 2 });
    await waitFor(() =>
      expect(
        screen.getByTestId("schematic-checkout-summary"),
      ).toHaveTextContent("Due today$25.00"),
    );
  });
});

/** The step on screen, as the layout reports it. */
const stepShown = () =>
  document
    .querySelector(".schematic-checkout__layout")
    ?.getAttribute("data-step");
const summary = () => screen.getByTestId("schematic-checkout-summary");
const finalizeButton = () => screen.getByTestId("schematic-checkout-finalize");

describe("Checkout end to end on the server's own pricing", () => {
  const premium = catalogPlan({
    monthlyPrice: monthly(5000),
    name: "Premium",
  });
  const priced = (
    props: Partial<CheckoutProps> = {},
    options: ServerOptions = {},
  ) =>
    renderStack(
      { steps: { initial: "payment" }, ...props },
      {
        catalog: catalog({ plans: [starter, premium] }),
        priced: true,
        ...options,
      },
    );

  test("itemizes a plan change's proration from the server's lines", async () => {
    priced({ selection: { planId: premium.id } });
    await waitFor(() => expect(summary()).toHaveTextContent("Proration"));
    expect(summary()).toHaveTextContent("Due today$62.50");
    const toggle = within(summary()).getByRole("button", {
      name: "Show details",
    });
    expect(summary()).toHaveTextContent("$12.50");
    fireEvent.click(toggle);
    expect(summary()).toHaveTextContent("Unused time on Starter");
    expect(summary()).toHaveTextContent("-$12.50");
    expect(summary()).toHaveTextContent("Remaining time on Premium");
    expect(summary()).toHaveTextContent("$25.00");
    expect(
      summary().querySelectorAll(".schematic-checkout__proration-period"),
    ).toHaveLength(2);
  });

  test("says when the catalog bills the proration on the next invoice", async () => {
    const deferred = catalog({ plans: [starter, premium] });
    priced(
      { selection: { planId: premium.id } },
      {
        catalog: {
          ...deferred,
          checkoutSettings: {
            ...deferred.checkoutSettings,
            prorationBehavior: "create_prorations",
          },
        },
      },
    );
    await waitFor(() =>
      expect(summary()).toHaveTextContent(
        /Prorated changes are billed on your next invoice, [A-Z][a-z]+ \d+, \d{4}\./,
      ),
    );
  });

  test("says what a change worth more than its charges leaves in credit", async () => {
    const enterprise = catalogPlan({
      current: true,
      monthlyPrice: monthly(30000),
      name: "Enterprise",
    });
    const lite = catalogPlan({ current: false, name: "Lite" });
    priced(
      { selection: { planId: lite.id } },
      {
        catalog: catalog({ plans: [enterprise, lite] }),
        company: companyOn(enterprise),
      },
    );
    await waitFor(() =>
      expect(summary()).toHaveTextContent(
        "$112.50 in credit will be applied to your future invoices.",
      ),
    );
    expect(summary()).toHaveTextContent("Due today$0.00");
    expect(finalizeButton()).toHaveTextContent("Confirm");
  });

  test("takes a refused finalize to the step that can fix it", async () => {
    const seats = payInAdvanceEntitlement();
    const withSeats = catalogPlan({ entitlements: [seats], name: "Team" });
    const { seen } = priced(
      { selection: { planId: withSeats.id } },
      {
        catalog: catalog({ plans: [starter, withSeats] }),
        refuse: [
          {
            code: "pay_in_advance_required",
            message: "Choose how many seats.",
          },
        ],
      },
    );
    await waitFor(() => expect(stepShown()).toBe("payment"));
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
    fireEvent.click(finalizeButton());
    await waitFor(() => expect(stepShown()).toBe("usage"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose how many seats.",
    );
    expect(seen.some((s) => s.path.endsWith("/finalize"))).toBe(true);
  });

  test("confirms a payment the customer must approve before completing", async () => {
    const { onComplete, seen } = priced({}, { confirmSecret: "pi_secret" });
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
    fireEvent.click(finalizeButton());
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(stripe.confirmPayment).toHaveBeenCalledWith(
      expect.anything(),
      "pi_secret",
    );
    expect(
      seen.some(
        (s) => s.method === "POST" && s.path === "/components/setup-intent",
      ),
    ).toBe(true);
  });

  test("pays with a card saved on the way, which the server then has on file", async () => {
    const { onComplete, seen } = priced({}, { paymentMethods: [] });
    // Nothing on file: the form is up and the charge is held.
    await screen.findByText("fake save");
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Add a payment method",
      ),
    );
    expect(finalizeButton()).toBeDisabled();

    fireEvent.click(screen.getByText("fake save"));
    await waitFor(() =>
      expect(
        seen.find(
          (s) =>
            s.method === "POST" && s.path === "/checkout/paymentmethod/update",
        )?.body,
      ).toMatchObject({ payment_method_id: "pm_new" }),
    );
    await waitFor(() =>
      expect(
        document.querySelector(".schematic-payment-methods__current"),
      ).toHaveTextContent("4242"),
    );
    await waitFor(() => expect(finalizeButton()).toBeEnabled());
    const lastPut = [...seen]
      .reverse()
      .find((s) => s.method === "PUT" && s.path.startsWith("/checkouts/"));
    expect(lastPut?.body).toMatchObject({ payment_method_id: "pm_new" });

    fireEvent.click(finalizeButton());
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });
});
