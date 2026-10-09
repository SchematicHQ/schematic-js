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
import { cardPaymentMethod } from "./fixtures/builders";
import {
  catalog,
  catalogPlan,
  companyOn,
  creditBundle,
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
    "company" | "confirmSecret" | "conflictOnce" | "refuse"
  >
>;

function serve(options: ServerOptions = {}) {
  const server = fakeBillingServer({
    catalog: catalog({ creditBundles: [bundle], plans: [starter, pro] }),
    company: options.company ?? companyOn(starter),
    paymentMethods: [card],
    price: (wire) => {
      const due =
        [starter, pro].find((p) => p.id === wire.new_plan_id)?.monthlyPrice
          ?.price ?? 0;
      return {
        dueNow: due,
        paymentMethodRequired: false,
        totalPerBillingPeriod: due,
      };
    },
    ...options,
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
