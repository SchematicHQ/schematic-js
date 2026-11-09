import type { CreditLedgerEntry } from "@schematichq/schematic-react";

import {
  LOG_NOW,
  creditLedgerEntry,
  logMinutesAgo,
} from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";

import { deriveCreditLog } from "./creditLog";

const L = "en-US";

function row(overrides: Partial<CreditLedgerEntry>) {
  return deriveCreditLog(
    { entries: [creditLedgerEntry(overrides)], hasMore: false },
    { locale: L, now: LOG_NOW },
  ).rows[0];
}

describe("deriveCreditLog", () => {
  test("reads the roadmap log newest first", () => {
    const page = SCENARIOS.creditLog().creditLedger;
    if (page === undefined) {
      throw new Error("the scenario has a ledger");
    }
    const { rows, hasMore } = deriveCreditLog(page, {
      locale: L,
      now: LOG_NOW,
    });
    expect(hasMore).toBe(false);
    expect(
      rows.map(({ kind, action, subject, amountText, positive }) => [
        kind,
        action,
        subject,
        positive ? `+${amountText}` : `-${amountText}`,
      ]),
    ).toEqual([
      ["draw", "usage", "Dashboard prompt", "-1.5"],
      ["topup", "autoTopup", "Booster pack", "+1,000"],
      ["draw", "usage", "Video generation", "-25"],
      ["draw", "usage", "AI conversation", "-3"],
      ["draw", "usage", "Dashboard prompt", "-1.5"],
      ["draw", "usage", "Dashboard prompt", "-1"],
      ["grant", "planGrant", null, "+5,000"],
      ["expiry", "reset", null, "-410"],
    ]);
  });

  test.each<[string, Partial<CreditLedgerEntry>, object]>([
    [
      "a draw names its feature and user",
      {},
      {
        kind: "draw",
        action: "usage",
        subject: "Video generation",
        who: { kind: "user", name: "Ada" },
      },
    ],
    [
      "a draw without a user has no who",
      { user: undefined },
      { kind: "draw", who: null },
    ],
    [
      "a refunded draw is a reversal",
      { amount: 7 },
      { kind: "reversal", action: "refund", positive: true },
    ],
    [
      "an operator's correction is a usage adjustment",
      { amount: -4, usageReason: "manual_adjustment", user: undefined },
      { kind: "draw", action: "usageAdjustment", who: { kind: "manual" } },
    ],
    [
      "a purchase is a top-up from its bundle",
      {
        amount: 500,
        kind: "grant",
        grantReason: "purchased",
        bundle: { id: "b", name: "Starter pack" },
        user: undefined,
        feature: undefined,
      },
      {
        kind: "topup",
        action: "purchase",
        subject: "Starter pack",
        who: { kind: "purchase" },
      },
    ],
    [
      "a free grant came from someone by hand",
      {
        amount: 50,
        kind: "grant",
        grantReason: "free",
        user: undefined,
        feature: undefined,
      },
      { kind: "grant", action: "freeGrant", who: { kind: "manual" } },
    ],
    [
      "a rollover comes from the plan",
      {
        amount: 50,
        kind: "grant",
        grantReason: "rollover",
        user: undefined,
        feature: undefined,
      },
      { kind: "grant", action: "rollover", who: { kind: "plan" } },
    ],
    [
      "an expiry inherits its grant's source",
      {
        amount: -20,
        kind: "zero_out",
        grantReason: "purchased",
        zeroedOutReason: "expired",
        user: undefined,
        feature: undefined,
      },
      { kind: "expiry", action: "expired", who: { kind: "purchase" } },
    ],
    [
      "an expiry for a reason it does not know reads as removed",
      {
        amount: -20,
        kind: "zero_out",
        zeroedOutReason: "manual",
        user: undefined,
        feature: undefined,
      },
      { kind: "expiry", action: "removed", who: { kind: "plan" } },
    ],
  ])("%s", (_name, overrides, expected) => {
    expect(row(overrides)).toMatchObject(expected);
  });

  test("names the one credit a log is in, and none for several", () => {
    const view = (entries: CreditLedgerEntry[]) =>
      deriveCreditLog({ entries, hasMore: false }, { locale: L, now: LOG_NOW })
        .credit;
    expect(view([creditLedgerEntry(), creditLedgerEntry()])).toEqual({
      id: "bcr_ai",
      name: "AI credits",
    });
    expect(
      view([
        creditLedgerEntry(),
        creditLedgerEntry({ credit: { id: "bcr_x", name: "Export credit" } }),
      ]),
    ).toBeNull();
    expect(view([])).toBeNull();
  });

  test("names the credit in the singular for one", () => {
    expect(row({ amount: -1 }).unit).toBe("AI credit");
    expect(row({ amount: -1.5 }).unit).toBe("AI credits");
    expect(
      row({ amount: -2, credit: { id: "bcr_x", name: "Export credit" } }).unit,
    ).toBe("Export credits");
  });

  test("says today and yesterday, and the date before that", () => {
    expect(row({ eventAt: logMinutesAgo(10) })).toMatchObject({
      day: "today",
      whenText: "2:50 PM",
    });
    expect(row({ eventAt: logMinutesAgo(24 * 60) })).toMatchObject({
      day: "yesterday",
      whenText: "3:00 PM",
    });
    expect(row({ eventAt: logMinutesAgo(3 * 24 * 60) })).toMatchObject({
      day: null,
      whenText: "Aug 18, 3:00 PM",
    });
  });

  test("leaves an unreadable time blank", () => {
    expect(row({ eventAt: new Date("nope") })).toMatchObject({
      at: null,
      day: null,
      whenText: "",
    });
  });
});
