import { describe, expect, it } from "vitest";

import {
  InvoiceResponseDataFromJSON,
  CreditCompanyGrantViewFromJSON,
} from "../checkoutexternal";
import {
  deriveAppliedBalance,
  filterInvoicesForDisplay,
  getPlanManagerNotice,
  groupCreditGrants,
} from "./derive";
import { makeWireInvoice } from "../__tests__/fixtures";

const DAY = 24 * 60 * 60 * 1000;

function invoice(overrides?: Record<string, unknown>) {
  return InvoiceResponseDataFromJSON(makeWireInvoice(overrides));
}

describe("filterInvoicesForDisplay", () => {
  it("drops zero-amount, upcoming, and hidden-status invoices", () => {
    const kept = filterInvoicesForDisplay([
      invoice({ id: "ok" }),
      invoice({ id: "zero", amount_due: 0 }),
      invoice({ id: "upcoming", external_id: "upcoming_abc" }),
      invoice({ id: "void", status: "void" }),
      invoice({ id: "draft", status: "draft" }),
      invoice({ id: "uncollectible", status: "uncollectible" }),
    ]);
    expect(kept.map((i) => i.id)).toEqual(["ok"]);
  });

  it("hides unpaid invoices that are not yet due, unless hideUpcoming is off", () => {
    const future = new Date(Date.now() + 30 * DAY).toISOString();
    const past = new Date(Date.now() - 30 * DAY).toISOString();
    const invoices = [
      invoice({ id: "open_future", status: "open", due_date: future }),
      invoice({ id: "open_pastdue", status: "open", due_date: past }),
      invoice({ id: "paid", status: "paid" }),
    ];

    // Sorted newest-first: the past-due invoice (now-30d) postdates the paid
    // fixture's January due date.
    expect(filterInvoicesForDisplay(invoices).map((i) => i.id)).toEqual([
      "open_pastdue",
      "paid",
    ]);
    expect(
      filterInvoicesForDisplay(invoices, { hideUpcoming: false }).map(
        (i) => i.id,
      ),
    ).toEqual(["open_future", "open_pastdue", "paid"]);
  });

  it("sorts by dueDate falling back to createdAt, newest first", () => {
    const kept = filterInvoicesForDisplay([
      invoice({ id: "older", due_date: "2026-01-01T00:00:00Z" }),
      invoice({
        id: "newest",
        due_date: null,
        created_at: "2026-03-01T00:00:00Z",
      }),
      invoice({ id: "middle", due_date: "2026-02-01T00:00:00Z" }),
    ]);
    expect(kept.map((i) => i.id)).toEqual(["newest", "middle", "older"]);
  });
});

describe("deriveAppliedBalance", () => {
  it("returns undefined when the customer holds no credit", () => {
    expect(
      deriveAppliedBalance(invoice({ starting_balance: 0 })),
    ).toBeUndefined();
    expect(
      deriveAppliedBalance(invoice({ starting_balance: 500 })),
    ).toBeUndefined();
  });

  it("trusts a negative ending balance (credit left over)", () => {
    const result = deriveAppliedBalance(
      invoice({ starting_balance: -1000, ending_balance: -400, subtotal: 600 }),
    )!;
    expect(result.customerCredit).toBe(1000);
    expect(result.applied).toBe(600);
    expect(result.remaining).toBe(400);
  });

  it("caps applied credit at the subtotal when ending balance is zeroed (preview invoices)", () => {
    const result = deriveAppliedBalance(
      invoice({ starting_balance: -1000, ending_balance: 0, subtotal: 300 }),
    )!;
    expect(result.customerCredit).toBe(1000);
    expect(result.applied).toBe(300);
    expect(result.remaining).toBe(700);
  });
});

describe("getPlanManagerNotice", () => {
  const now = () => Date.parse("2026-06-01T00:00:00Z");
  const sub = (overrides: Record<string, unknown>) =>
    ({
      status: "active",
      cancelAtPeriodEnd: false,
      ...overrides,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  it("prioritizes trial over cancellation over downgrade", () => {
    const trialing = sub({
      status: "trialing",
      trialEnd: new Date("2026-06-04T00:00:00Z"),
      cancelAtPeriodEnd: true,
      cancelAt: new Date("2026-07-01T00:00:00Z"),
    });

    const downgrade = {
      toPlanName: "Basic",
      effectiveAfter: new Date("2026-07-01T00:00:00Z"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const notice = getPlanManagerNotice(trialing, downgrade, now);
    expect(notice).toMatchObject({ kind: "trial", daysLeft: 3 });

    const canceled = getPlanManagerNotice(
      sub({
        cancelAtPeriodEnd: true,
        cancelAt: new Date("2026-07-01T00:00:00Z"),
      }),
      downgrade,
      now,
    );
    expect(canceled).toMatchObject({ kind: "canceled" });

    expect(getPlanManagerNotice(sub({}), downgrade, now)).toMatchObject({
      kind: "downgrade",
      toPlanName: "Basic",
    });
  });

  it("returns undefined when nothing noteworthy is happening", () => {
    expect(getPlanManagerNotice(sub({}), undefined, now)).toBeUndefined();
    expect(getPlanManagerNotice(undefined, undefined, now)).toBeUndefined();
  });

  it("ignores an expired trial", () => {
    const expired = sub({
      status: "trialing",
      trialEnd: new Date("2026-05-01T00:00:00Z"),
    });
    expect(getPlanManagerNotice(expired, undefined, now)).toBeUndefined();
  });
});

describe("groupCreditGrants", () => {
  function grant(overrides?: Record<string, unknown>) {
    return CreditCompanyGrantViewFromJSON({
      id: `grant_${Math.random().toString(36).slice(2)}`,
      billing_credit_id: "credit_ai",
      company_id: "comp_demo",
      company_name: "Demo",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      credit_description: "AI credits",
      credit_name: "AI Credits",
      grant_reason: "plan",
      quantity: 100,
      quantity_remaining: 40,
      quantity_used: 60,
      renewal_enabled: false,
      source_label: "Plan",
      ...overrides,
    });
  }

  it("groups by credit id and sums totals", () => {
    const groups = groupCreditGrants([
      grant(),
      grant({
        grant_reason: "purchased",
        quantity: 50,
        quantity_remaining: 50,
        quantity_used: 0,
      }),
      grant({ billing_credit_id: "credit_other", credit_name: "Other" }),
    ]);

    expect(groups).toHaveLength(2);
    const ai = groups.find((g) => g.creditId === "credit_ai")!;
    expect(ai.total).toEqual({ value: 150, used: 60, remaining: 90 });
    expect(ai.grants).toHaveLength(2);
    expect(groups.find((g) => g.creditId === "credit_other")!.name).toBe(
      "Other",
    );
  });

  it("returns an empty list for no grants", () => {
    expect(groupCreditGrants([])).toEqual([]);
  });
});
