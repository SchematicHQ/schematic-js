import { NOW, creditBalance, daysFromNow } from "../fixtures/builders";
import { streamSpendPolicy } from "../fixtures/stream";

import {
  deriveBalanceBadge,
  pickBadgeCredit,
  resetDistance,
} from "./balanceBadge";

const L = "en-US";

const ai = () =>
  creditBalance({ creditId: "bcr_ai", remaining: 2450, total: 5000 });

describe("pickBadgeCredit", () => {
  test("takes the only credit the company holds", () => {
    const unheld = creditBalance({ grants: [], remaining: 0, total: 0 });
    expect(pickBadgeCredit([unheld, ai()])?.creditId).toBe("bcr_ai");
  });

  test("takes none of several without a creditId", () => {
    expect(pickBadgeCredit([ai(), creditBalance()])).toBeUndefined();
  });

  test("takes the named credit, or none when it is missing", () => {
    const other = creditBalance({ creditId: "bcr_other" });
    expect(pickBadgeCredit([ai(), other], "bcr_other")).toBe(other);
    expect(pickBadgeCredit([ai()], "bcr_missing")).toBeUndefined();
  });
});

describe("deriveBalanceBadge", () => {
  test("shows the balance with the share used", () => {
    const view = deriveBalanceBadge([ai()], { locale: L });
    expect(view).toMatchObject({
      constraint: { kind: "balance" },
      percent: 51,
      remaining: { amount: "2,450", units: "AI credits" },
      tone: "ok",
      total: "5,000",
    });
    expect(view?.resetsAt).toEqual(daysFromNow(10));
  });

  test("renders nothing for a credit the company holds none of", () => {
    const unheld = creditBalance({ grants: [], remaining: 0, total: 0 });
    expect(
      deriveBalanceBadge([unheld], { creditId: unheld.creditId, locale: L }),
    ).toBeNull();
  });

  test("prefers the live balance", () => {
    const view = deriveBalanceBadge([ai()], { liveRemaining: 500, locale: L });
    expect(view).toMatchObject({
      percent: 90,
      remaining: { amount: "500" },
      tone: "warning",
    });
  });

  test("turns amber at warnAt", () => {
    const balance = creditBalance({ remaining: 1000, total: 5000 });
    expect(deriveBalanceBadge([balance], { locale: L })?.tone).toBe("warning");
    expect(deriveBalanceBadge([balance], { locale: L, warnAt: 90 })?.tone).toBe(
      "ok",
    );
  });

  test("blocks on an empty balance", () => {
    const balance = creditBalance({ remaining: 0, total: 5000 });
    expect(deriveBalanceBadge([balance], { locale: L })).toMatchObject({
      constraint: { kind: "balance" },
      percent: 100,
      tone: "blocked",
    });
  });

  test("takes a cap tighter than the balance", () => {
    const policy = streamSpendPolicy();
    const view = deriveBalanceBadge([ai()], { locale: L, policies: [policy] });
    expect(view).toMatchObject({
      constraint: { kind: "cap", cap: { id: policy.id, period: "daily" } },
      percent: 88,
      tone: "warning",
    });
    expect(view?.resetsAt).toEqual(policy.resetsAt);
  });

  test("keeps the balance while a tighter cap is under warnAt", () => {
    const view = deriveBalanceBadge([ai()], {
      locale: L,
      policies: [streamSpendPolicy({ consumed: 30 })],
    });
    expect(view).toMatchObject({
      constraint: { kind: "balance" },
      percent: 51,
      tone: "ok",
    });
    expect(view?.resetsAt).toEqual(daysFromNow(10));
  });

  test("keeps the balance when it is tighter than a cap", () => {
    const view = deriveBalanceBadge([ai()], {
      locale: L,
      policies: [streamSpendPolicy({ consumed: 5 })],
    });
    expect(view?.constraint).toEqual({ kind: "balance" });
    expect(view?.caps).toHaveLength(1);
  });

  test("blocks on a reached cap", () => {
    const view = deriveBalanceBadge([ai()], {
      locale: L,
      policies: [streamSpendPolicy({ consumed: 50 })],
    });
    expect(view).toMatchObject({ percent: 100, tone: "blocked" });
    expect(view?.constraint.kind).toBe("cap");
  });

  test("lists caps tightest first and reads a billing period as monthly", () => {
    const view = deriveBalanceBadge([ai()], {
      locale: L,
      policies: [
        streamSpendPolicy({
          consumed: 100,
          limit: 400,
          scope: "company",
          window: { count: 1, unit: "billing_period" },
        }),
        streamSpendPolicy(),
      ],
    });
    expect(view?.caps.map((cap) => [cap.scope, cap.period])).toEqual([
      ["user", "daily"],
      ["company", "monthly"],
    ]);
  });

  test("leaves per-use caps out of the state", () => {
    const view = deriveBalanceBadge([ai()], {
      locale: L,
      policies: [
        streamSpendPolicy({ kind: "per_draw", limit: 25, window: undefined }),
        streamSpendPolicy({ kind: "per_draw", limit: 10, window: undefined }),
      ],
    });
    expect(view).toMatchObject({
      caps: [],
      constraint: { kind: "balance" },
      perUse: { amount: "10", units: "AI credits" },
    });
  });

  test("ignores another credit's policies and unknown windows", () => {
    const view = deriveBalanceBadge([ai()], {
      locale: L,
      policies: [
        streamSpendPolicy({ creditId: "bcr_other", consumed: 50 }),
        streamSpendPolicy({ window: { count: 1, unit: "fortnight" } }),
        streamSpendPolicy({ limit: 0 }),
      ],
    });
    expect(view?.caps).toEqual([]);
  });
});

describe("resetDistance", () => {
  const at = (ms: number) => new Date(NOW.getTime() + ms);

  test("reads hours and minutes under a day", () => {
    expect(resetDistance(at(6 * 3600_000), NOW)).toEqual({
      unit: "hour",
      value: 6,
    });
    expect(resetDistance(at(45 * 60_000), NOW)).toEqual({
      unit: "minute",
      value: 45,
    });
    expect(resetDistance(at(10_000), NOW)).toEqual({
      unit: "minute",
      value: 1,
    });
  });

  test("leaves a day or more to the date", () => {
    expect(resetDistance(at(24 * 3600_000), NOW)).toBeNull();
  });
});
