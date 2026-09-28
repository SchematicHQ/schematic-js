import { SchematicBillingClient, billingApi } from "@schematichq/schematic-js";
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
  checkoutDraft,
  company,
  companyOn,
  creditBundle,
  priceSnapshot,
} from "./fixtures/checkout";

const stripe = vi.hoisted(() => ({
  confirmPayment: vi.fn(async () => undefined),
  loadStripeForIntent: vi.fn(async () => ({})),
}));
vi.mock("./stripe", () => stripe);

/**
 * The whole stack with fetch faked at the network edge: wire JSON through the
 * schematic-js client, its CheckoutDraft and the schematic-react hooks to the
 * DOM. The server below keeps one checkout the way the API does: a version
 * every write must name, a session each re-price hands out, and a price that
 * is simply the plan's.
 */

const starter = catalogPlan({ current: true, name: "Starter" });
const pro = catalogPlan({ name: "Pro" });
const bundle = creditBundle();
const card = cardPaymentMethod({ isDefault: true });

interface ServerOptions {
  /** Answer the first PUT with a 409, as another writer would cause. */
  conflictOnce?: boolean;
  /** Refuse the finalize with these problems. */
  refuse?: { code: string; message: string }[];
  /** Answer the finalize with a payment the customer must confirm. */
  confirmSecret?: string;
  company?: ReturnType<typeof company>;
}

type Seen = { method: string; path: string; body: unknown; session?: string };

function serve(options: ServerOptions = {}) {
  const seen: Seen[] = [];
  let version = 0;
  let conflicted = false;
  let selections: Record<string, unknown> = {};
  let session = 0;

  const json = (
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
  ) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    });
  const draft = () => {
    const planId = selections.new_plan_id as string | undefined;
    const plan = [starter, pro].find((p) => p.id === planId);
    const due = plan?.monthlyPrice?.price ?? 0;
    return billingApi.CheckoutDraftResponseDataToJSON(
      checkoutDraft({
        id: "chk_e2e",
        priceSnapshot: priceSnapshot({
          dueNow: due,
          paymentMethodRequired: false,
          totalPerBillingPeriod: due,
        }),
        version,
      }),
    );
  };

  const fetchImpl = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      const body =
        typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      const headers = (init?.headers ?? {}) as Record<string, string>;
      seen.push({
        method,
        path: url.pathname,
        body,
        session: headers["X-Checkout-Session-ID"],
      });

      switch (`${method} ${url.pathname}`) {
        case "GET /catalog/view":
          return json(200, {
            data: billingApi.CompanyCatalogResponseDataToJSON(
              catalog({ creditBundles: [bundle], plans: [starter, pro] }),
            ),
          });
        case "GET /company":
          return json(200, {
            data: billingApi.CompanyContextResponseDataToJSON(
              options.company ?? companyOn(starter),
            ),
          });
        case "GET /company/payment-methods":
          return json(200, {
            data: {
              count: 1,
              payment_methods: [
                billingApi.CompanyPaymentMethodResponseDataToJSON(card),
              ],
            },
          });
        case "GET /company/usage":
          return json(200, { data: { features: [] } });
        case "POST /checkouts":
          selections = body;
          version = 1;
          return json(201, { data: draft() });
        case "GET /checkouts/chk_e2e":
          return json(200, { data: draft() });
        case "PUT /checkouts/chk_e2e": {
          if (options.conflictOnce === true && !conflicted) {
            conflicted = true;
            version += 1; // somebody else wrote
            return json(409, {
              error: "The checkout changed since it was read.",
            });
          }
          if (body.version !== version) {
            return json(409, {
              error: "The checkout changed since it was read.",
            });
          }
          selections = body;
          version += 1;
          session += 1;
          return json(
            200,
            { data: draft() },
            { "X-Checkout-Session-ID": `cs_${session}` },
          );
        }
        case "POST /checkouts/chk_e2e/finalize":
          if (options.refuse !== undefined) {
            version += 2;
            return json(400, {
              error: options.refuse[0].message,
              problems: options.refuse.map((p) => ({
                ...p,
                blocking: true,
                source: "validation",
              })),
            });
          }
          return json(200, {
            data: {
              cancel_at_period_end: false,
              confirm_payment_intent_client_secret:
                options.confirmSecret ?? null,
              created_at: "2026-09-28T12:00:00Z",
              currency: "usd",
              customer_external_id: "cus_1",
              id: "bilsub_1",
              interval: "month",
              period_end: 1790000000,
              period_start: 1787000000,
              provider_type: "stripe",
              status: "active",
              subscription_external_id: "sub_1",
              total_price: 2500,
            },
          });
        case "POST /components/setup-intent":
          return json(200, {
            data: {
              publishable_key: "pk_acct",
              schematic_publishable_key: "pk_sch",
              setup_intent_client_secret: "seti_1",
            },
          });
      }
      return json(404, { error: "not found" });
    },
  );
  return { fetchImpl: fetchImpl as unknown as typeof fetch, seen };
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
