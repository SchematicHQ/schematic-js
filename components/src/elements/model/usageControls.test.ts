import { company, creditBalance, spendPolicy } from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";

import {
  deriveUsageControls,
  nextReset,
  takenCaps,
  windowUnitFor,
} from "./usageControls";

const L = "en-US";

function view(data = SCENARIOS.usageControls(), credits?: string[]) {
  return deriveUsageControls(data.spendPolicies ?? [], data.creditBalances, {
    credits,
    locale: L,
  });
}

describe("deriveUsageControls", () => {
  test("orders the company first, then people by name, per-use last", () => {
    const policies = [
      spendPolicy({ id: "per_use", maxPerDraw: 5, windowAmount: undefined }),
      spendPolicy({
        id: "zed",
        scopeType: "user",
        user: { id: "u_z", name: "Zed" },
        userId: "u_z",
      }),
      spendPolicy({ id: "week", windowUnit: "week" }),
      spendPolicy({ id: "hour", windowUnit: "hour" }),
      spendPolicy({
        id: "amy",
        scopeType: "user",
        user: { id: "u_a", name: "Amy" },
        userId: "u_a",
      }),
    ];
    const ids = deriveUsageControls(policies, [], { locale: L }).rows.map(
      (r) => r.id,
    );
    expect(ids).toEqual(["hour", "week", "per_use", "amy", "zed"]);
  });

  test("marks a window near its cap at 80% and reached at 100%", () => {
    const rows = view().rows;
    const status = Object.fromEntries(rows.map((r) => [r.id, r.status]));
    expect(status).toEqual({
      csp_company: "ok",
      csp_ada: "near",
      csp_bo: "reached",
      csp_cy: "ok",
    });
    const ada = rows.find((r) => r.id === "csp_ada");
    expect(ada).toMatchObject({
      consumedText: "42",
      limitText: "50",
      percent: 84,
      period: "day",
      userName: "Ada",
    });
  });

  test("a per-use cap has no meter or reset", () => {
    const cy = view().rows.find((r) => r.id === "csp_cy");
    expect(cy).toMatchObject({
      consumed: null,
      kind: "perUse",
      limit: 25,
      period: null,
      resetsAt: null,
      unitName: "AI credits",
    });
  });

  test("inflects the credit for the cap and names the one credit", () => {
    const one = deriveUsageControls([spendPolicy({ windowAmount: 1 })], [], {
      locale: L,
    });
    expect(one.rows[0].unitName).toBe("AI credit");
    expect(one.credit).toEqual({ id: "bcr_ai", name: "AI credits" });
  });

  test("falls back to the balance's name when the policy carries none", () => {
    const rows = deriveUsageControls(
      [spendPolicy({ billingCreditId: "bcr_x", credit: null })],
      [creditBalance({ creditId: "bcr_x", creditName: "Export" })],
      { locale: L },
    ).rows;
    expect(rows[0].creditName).toBe("Exports");
  });

  test("names no single credit when limits span several", () => {
    const derived = deriveUsageControls(
      [
        spendPolicy(),
        spendPolicy({
          billingCreditId: "bcr_x",
          credit: { id: "bcr_x", name: "Export credit" },
        }),
      ],
      [],
      { locale: L },
    );
    expect(derived.credit).toBeNull();
  });

  test("narrows rows and Add's credits to `credits`", () => {
    const data = SCENARIOS.usageControls();
    const derived = deriveUsageControls(
      [
        ...(data.spendPolicies ?? []),
        spendPolicy({ billingCreditId: "bcr_x" }),
      ],
      [...(data.creditBalances ?? []), creditBalance({ creditId: "bcr_x" })],
      { credits: ["bcr_x"], locale: L },
    );
    expect(derived.rows).toHaveLength(1);
    expect(derived.creditOptions.map((c) => c.id)).toEqual(["bcr_x"]);
  });

  test("reads a company calendar-month cap apart from the plan period", () => {
    const rows = deriveUsageControls(
      [
        spendPolicy({ windowUnit: "month" }),
        spendPolicy({ windowUnit: "billing_period" }),
      ],
      [],
      { locale: L },
    ).rows;
    expect(rows.map((r) => r.period)).toEqual([
      "calendarMonth",
      "billingPeriod",
    ]);
  });
});

describe("takenCaps", () => {
  const rows = view().rows;

  test("a company plan-period cap takes Monthly", () => {
    expect(takenCaps(rows, { creditId: "bcr_ai", userId: null })).toEqual({
      perUse: false,
      periods: new Set(["month"]),
    });
  });

  test("a member's caps are theirs alone", () => {
    expect(takenCaps(rows, { creditId: "bcr_ai", userId: "user_cy" })).toEqual({
      perUse: true,
      periods: new Set(),
    });
    expect(
      takenCaps(rows, { creditId: "bcr_ai", userId: "user_ada" }).periods,
    ).toEqual(new Set(["day"]));
  });

  test("the policy being edited does not block itself", () => {
    expect(
      takenCaps(rows, { creditId: "bcr_ai", userId: "user_ada" }, "csp_ada")
        .periods,
    ).toEqual(new Set());
  });

  test("another credit's caps do not count", () => {
    expect(
      takenCaps(rows, { creditId: "bcr_x", userId: null }).periods.size,
    ).toBe(0);
  });
});

describe("windowUnitFor", () => {
  test("Monthly is the plan period for the company, the calendar for a user", () => {
    expect(windowUnitFor("month", null)).toBe("billing_period");
    expect(windowUnitFor("month", "user_ada")).toBe("month");
    expect(windowUnitFor("week", null)).toBe("week");
  });
});

describe("nextReset", () => {
  // A Friday afternoon, UTC.
  const now = new Date("2026-08-21T15:30:00.000Z");

  test.each([
    ["hour", "2026-08-21T16:00:00.000Z"],
    ["day", "2026-08-22T00:00:00.000Z"],
    ["week", "2026-08-24T00:00:00.000Z"],
  ] as const)("a new %s cap resets at the next UTC boundary", (period, at) => {
    expect(nextReset(period, null, undefined, now).toISOString()).toBe(at);
  });

  test("a company Monthly cap resets with the plan period", () => {
    const acme = company();
    expect(nextReset("month", null, acme, now)).toEqual(
      acme.subscription?.periodEnd,
    );
  });

  test("a user's, or one without a subscription, on the 1st", () => {
    const first = "2026-09-01T00:00:00.000Z";
    expect(nextReset("month", "user_ada", company(), now).toISOString()).toBe(
      first,
    );
    expect(
      nextReset(
        "month",
        null,
        company({ subscription: null }),
        now,
      ).toISOString(),
    ).toBe(first);
  });
});
