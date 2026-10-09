/**
 * The billing API in memory, behind a `fetch`: the catalog, company and
 * payment-method reads, one persisted checkout kept the way the server keeps
 * it — a version every write must name, a session each re-price hands out,
 * a price for what the cart holds — and the writes around a card. The
 * Checkout end-to-end test and the local harness both run the whole stack on
 * it, so what one proves the other shows.
 */

import { billingApi } from "@schematichq/schematic-js";
import type {
  Catalog,
  CatalogPlan,
  Checkout,
  CheckoutPriceSnapshot,
  CheckoutProblem,
  Company,
  FeatureUsage,
  PaymentMethod,
  TaxId,
} from "@schematichq/schematic-react";

import { cardPaymentMethod, daysFromNow } from "./builders";
import { checkoutDraft, priceSnapshot, problem } from "./checkout";

/** The selections as a write sends them, the keys the server reads. */
export interface WireSelections {
  add_on_ids?: { add_on_id: string; price_id?: string }[];
  credit_bundles?: { bundle_id: string; quantity: number }[];
  custom_field_values?: { field_id: string; value: string }[];
  new_plan_id?: string;
  new_price_id?: string;
  pay_in_advance?: { price_id: string; quantity: number }[];
  payment_method_id?: string;
  promo_code?: string;
  skip_trial?: boolean;
  version?: number;
}

/** What a price answers with: the snapshot's figures and what is wrong. */
export interface Priced extends Partial<CheckoutPriceSnapshot> {
  problems?: CheckoutProblem[];
}

export interface FakeServerOptions {
  catalog: Catalog;
  company: Company;
  paymentMethods?: PaymentMethod[];
  featureUsage?: FeatureUsage[];
  taxIds?: TaxId[];
  /** The one checkout's id. Default `chk_e2e`. */
  checkoutId?: string;
  /** Answer the first PUT with a 409, as another writer would cause. */
  conflictOnce?: boolean;
  /** Refuse the finalize with these problems. */
  refuse?: Pick<CheckoutProblem, "code" | "message">[];
  /** Answer the finalize with a payment the customer must confirm. */
  confirmSecret?: string;
  /** In place of `priceSelections`. */
  price?: (wire: WireSelections, catalog: Catalog, company: Company) => Priced;
  /** Every answer waits this long, so a pending state can be seen. */
  latencyMs?: number;
}

export interface Seen {
  method: string;
  path: string;
  body: unknown;
  session?: string;
}

/** The server's state, open to a test or a page that wants to look. */
export interface FakeServerState {
  paymentMethods: PaymentMethod[];
  selections: WireSelections;
  taxIds: TaxId[];
  version: number;
}

const PROMO_CODE = "SAVE10";

/** A plan's price on the period the cart named, else its monthly one. */
function planPrice(plan: CatalogPlan, priceId: string | undefined): number {
  const prices = [
    plan.monthlyPrice,
    plan.quarterlyPrice,
    plan.yearlyPrice,
    ...plan.currencyPrices.flatMap((cp) => [
      cp.monthlyPrice,
      cp.quarterlyPrice,
      cp.yearlyPrice,
    ]),
  ];
  const named = prices.find((p) => p?.id === priceId);
  return (named ?? plan.monthlyPrice)?.price ?? 0;
}

/**
 * The price of what the cart holds, summed the way the summary's lines are:
 * the plan on its period, each add-on on the same, each quantity bought
 * ahead at its unit price, the bundles once. `SAVE10` takes a tenth off the
 * recurring charge and any other code blocks the cart, as the server's does; a trial
 * charges the bundles alone now; a plan change prorates half the plan left
 * behind; and a charge with no card to take it from is a blocking problem.
 */
export function priceSelections(
  wire: WireSelections,
  catalog: Catalog,
  company: Company,
): Priced {
  const plan = catalog.plans.find((p) => p.id === wire.new_plan_id);
  const addOns = (wire.add_on_ids ?? []).flatMap((a) => {
    const addOn = catalog.addOns.find((x) => x.id === a.add_on_id);
    return addOn === undefined ? [] : [{ addOn, priceId: a.price_id }];
  });
  const entitlements = [plan, ...addOns.map((a) => a.addOn)].flatMap((p) =>
    p === undefined ? [] : p.entitlements,
  );
  const unitPrice = (priceId: string) => {
    for (const e of entitlements) {
      if (e.meteredMonthlyPrice?.id === priceId) {
        return e.meteredMonthlyPrice.price;
      }
      if (e.meteredYearlyPrice?.id === priceId) {
        return e.meteredYearlyPrice.price;
      }
    }
    return 0;
  };

  let recurring = plan === undefined ? 0 : planPrice(plan, wire.new_price_id);
  for (const { addOn, priceId } of addOns) {
    recurring += planPrice(addOn, priceId);
  }
  for (const line of wire.pay_in_advance ?? []) {
    recurring += unitPrice(line.price_id) * line.quantity;
  }
  let oneTime = 0;
  for (const line of wire.credit_bundles ?? []) {
    const bundle = catalog.creditBundles.find((b) => b.id === line.bundle_id);
    oneTime += (bundle?.price?.price ?? 0) * line.quantity;
  }

  const problems: CheckoutProblem[] = [];
  let discount = 0;
  let promoCodeApplied = false;
  if (wire.promo_code !== undefined) {
    if (wire.promo_code.toUpperCase() === PROMO_CODE) {
      discount = Math.round(recurring / 10);
      promoCodeApplied = true;
    } else {
      // As the server refuses one: the selection is blocked until the code
      // is fixed or dropped.
      problems.push(
        problem({
          code: "selection_invalid",
          message: `The promo code ${wire.promo_code} is not valid.`,
          source: "validation",
        }),
      );
    }
  }

  const trial =
    plan !== undefined &&
    plan.isTrialable &&
    plan.companyCanTrial &&
    wire.skip_trial !== true;
  const changing =
    plan !== undefined &&
    company.plan != null &&
    company.plan.id !== plan.id &&
    company.subscription != null;
  const proration = changing ? -Math.round((company.plan?.price ?? 0) / 2) : 0;
  const newCharges = recurring - discount + oneTime;
  const dueNow = Math.max(0, trial ? oneTime : newCharges + proration);
  const paymentMethodRequired = dueNow > 0 || recurring > 0;
  if (paymentMethodRequired && wire.payment_method_id === undefined) {
    problems.push(problem());
  }

  return {
    currency: plan?.monthlyPrice?.currency ?? catalog.defaultCurrency,
    discountAmount: discount,
    dueNow,
    newCharges,
    paymentMethodRequired,
    percentOff: promoCodeApplied ? 10 : 0,
    problems,
    promoCodeApplied,
    proration,
    totalPerBillingPeriod: recurring - discount,
    trialEnd: trial ? daysFromNow(plan.trialDays ?? 14) : undefined,
  };
}

const json = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The billing API on `options`, as a `fetch` and the requests it saw. */
export function fakeBillingServer(options: FakeServerOptions): {
  fetch: typeof fetch;
  seen: Seen[];
  state: FakeServerState;
} {
  const { catalog, company } = options;
  const checkoutId = options.checkoutId ?? "chk_e2e";
  const price = options.price ?? priceSelections;
  const seen: Seen[] = [];
  const state: FakeServerState = {
    paymentMethods: [...(options.paymentMethods ?? [])],
    selections: {},
    taxIds: [...(options.taxIds ?? [])],
    version: 0,
  };
  let conflicted = false;
  let session = 0;

  const draft = (): Checkout => {
    const { problems, ...figures } = price(state.selections, catalog, company);
    return checkoutDraft({
      id: checkoutId,
      priceSnapshot: priceSnapshot(figures),
      problems: problems ?? [],
      version: state.version,
    });
  };
  const draftJson = () => billingApi.CheckoutDraftResponseDataToJSON(draft());
  const taxIdsJson = () =>
    billingApi.UpdateCheckoutTaxIDResponseDataToJSON({ taxIds: state.taxIds });

  const answer = (request: Seen, url: URL): Response => {
    const body = request.body as WireSelections & Record<string, unknown>;
    switch (`${request.method} ${url.pathname}`) {
      case "GET /catalog/view":
      case `GET /catalogs/${encodeURIComponent(catalog.id)}/view`:
        return json(200, {
          data: billingApi.CompanyCatalogResponseDataToJSON(catalog),
        });
      case "GET /company":
        return json(200, {
          data: billingApi.CompanyContextResponseDataToJSON(company),
        });
      case "GET /company/payment-methods":
        return json(200, {
          data: {
            count: state.paymentMethods.length,
            payment_methods: state.paymentMethods.map((m) =>
              billingApi.CompanyPaymentMethodResponseDataToJSON(m),
            ),
          },
        });
      case "GET /company/usage":
        return json(200, {
          data: {
            features: (options.featureUsage ?? []).map((row) =>
              billingApi.CompanyFeatureUsageResponseDataToJSON(row),
            ),
          },
        });
      case "POST /checkouts":
        state.selections = body;
        state.version = 1;
        return json(201, { data: draftJson() });
      case `GET /checkouts/${checkoutId}`:
        return json(200, { data: draftJson() });
      case `PUT /checkouts/${checkoutId}`: {
        if (options.conflictOnce === true && !conflicted) {
          conflicted = true;
          state.version += 1; // somebody else wrote
          return json(409, {
            error: "The checkout changed since it was read.",
          });
        }
        if (body.version !== state.version) {
          return json(409, {
            error: "The checkout changed since it was read.",
          });
        }
        state.selections = body;
        state.version += 1;
        session += 1;
        return json(
          200,
          { data: draftJson() },
          { "X-Checkout-Session-ID": `cs_${session}` },
        );
      }
      case `POST /checkouts/${checkoutId}/finalize`: {
        if (options.refuse !== undefined) {
          state.version += 2;
          return json(400, {
            error: options.refuse[0].message,
            problems: options.refuse.map((p) => ({
              ...p,
              blocking: true,
              source: "validation",
            })),
          });
        }
        const snapshot = draft().priceSnapshot;
        return json(200, {
          data: {
            cancel_at_period_end: false,
            confirm_payment_intent_client_secret: options.confirmSecret ?? null,
            created_at: "2026-09-28T12:00:00Z",
            currency: snapshot?.currency ?? "usd",
            customer_external_id: "cus_1",
            id: "bilsub_1",
            interval: "month",
            period_end: 1790000000,
            period_start: 1787000000,
            provider_type: "stripe",
            status: "active",
            subscription_external_id: "sub_1",
            total_price: snapshot?.totalPerBillingPeriod ?? 0,
          },
        });
      }
      case "POST /components/setup-intent":
        return json(200, {
          data: {
            publishable_key: "pk_acct",
            schematic_publishable_key: "pk_sch",
            setup_intent_client_secret: "seti_1",
          },
        });
      case "POST /checkout/paymentmethod/update": {
        // The card the form just saved joins the methods on file, as the
        // provider's does, and becomes the default.
        const externalId = String(body.payment_method_id);
        const known = state.paymentMethods.find(
          (m) => m.externalId === externalId,
        );
        state.paymentMethods = state.paymentMethods.map((m) => ({
          ...m,
          isDefault: false,
        }));
        const saved =
          known === undefined
            ? cardPaymentMethod({
                cardLast4: "4242",
                externalId,
                id: `pm_${externalId}`,
                isDefault: true,
              })
            : { ...known, isDefault: true };
        state.paymentMethods = [
          ...state.paymentMethods.filter((m) => m.id !== saved.id),
          saved,
        ];
        return json(200, {
          data: billingApi.CompanyPaymentMethodResponseDataToJSON(saved),
        });
      }
      case "GET /checkout/tax-id":
        return json(200, { data: taxIdsJson() });
      case "POST /checkout/tax-id": {
        const taxId = body.tax_id as { type: string; value: string };
        state.taxIds = [
          {
            country: "US",
            id: "txi_1",
            type: taxId.type,
            value: taxId.value,
            verificationStatus: "pending",
          },
        ];
        return json(200, { data: taxIdsJson() });
      }
    }
    if (request.method === "DELETE") {
      const match = url.pathname.match(/^\/checkout\/paymentmethod\/(.+)$/);
      if (match !== null) {
        const id = decodeURIComponent(match[1]);
        state.paymentMethods = state.paymentMethods.filter(
          (m) => m.id !== id && m.externalId !== id,
        );
        return json(200, { data: {} });
      }
    }
    return json(404, { error: "not found" });
  };

  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const body =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const request: Seen = {
      method,
      path: url.pathname,
      body,
      session: headers["X-Checkout-Session-ID"],
    };
    seen.push(request);
    if (options.latencyMs !== undefined && options.latencyMs > 0) {
      await sleep(options.latencyMs);
    }
    return answer(request, url);
  };

  return { fetch: fetchImpl as unknown as typeof fetch, seen, state };
}
