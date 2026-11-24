import { SchematicApiError } from "@schematichq/schematic-js";
import type { CreditOverdraft } from "@schematichq/schematic-react";

import { creditBalance, creditOverdraft } from "../fixtures/builders";

import { serverMessage } from "./errors";
import {
  deriveOverageLimit,
  overageLimitInputText,
  overageMoney,
  parseCredits,
  validateOverageLimit,
  type DeriveOverageLimitOptions,
} from "./overageLimit";

const L = "en-US";

function derive(
  fields: Partial<CreditOverdraft> = {},
  options: Partial<DeriveOverageLimitOptions> = {},
  balance = creditBalance({ creditId: "bcr_ai", resetsAt: undefined }),
) {
  return deriveOverageLimit(
    { balance, overdraft: creditOverdraft(fields) },
    { locale: L, ...options },
  );
}

describe("deriveOverageLimit", () => {
  test("the plan's default, with nothing used", () => {
    expect(derive()).toMatchObject({
      name: "AI credit",
      rate: "$0.02",
      unit: "AI credit",
      units: "AI credits",
      limit: { amount: "5,000", units: "AI credits", money: "$100.00" },
      limitValue: 5000,
      source: "planDefault",
      editable: true,
      planLocked: false,
      used: { amount: "0", money: "$0.00" },
      hasUsage: false,
      left: "5,000",
      percent: 0,
      tone: "ok",
      planDefault: { amount: "5,000" },
      max: { amount: "20,000", units: "AI credits" },
      maxFromProvider: false,
      canReset: false,
      resetsOn: null,
    });
  });

  test("the company's own limit, partly used", () => {
    expect(
      derive({
        companyLimit: 2000,
        debt: 1240,
        limitSource: "company",
        overdraftLimit: 2000,
      }),
    ).toMatchObject({
      limit: { amount: "2,000", money: "$40.00" },
      source: "company",
      used: { amount: "1,240", units: "AI credits", money: "$24.80" },
      hasUsage: true,
      left: "760",
      percent: 62,
      tone: "ok",
      canReset: true,
    });
  });

  test("turns amber at warnAt and red at the limit", () => {
    expect(derive({ debt: 1720, overdraftLimit: 2000 })).toMatchObject({
      left: "280",
      percent: 86,
      tone: "warning",
    });
    expect(
      derive({ debt: 1400, overdraftLimit: 2000 }, { warnAt: 70 }).tone,
    ).toBe("warning");
    expect(derive({ debt: 1400, overdraftLimit: 2000 }).tone).toBe("ok");
    expect(derive({ debt: 2000, overdraftLimit: 2000 })).toMatchObject({
      left: "0",
      percent: 100,
      tone: "blocked",
    });
    expect(derive({ debt: 2500, overdraftLimit: 2000 })).toMatchObject({
      left: "0",
      percent: 100,
      tone: "blocked",
    });
  });

  test("a limit of zero with nothing used is not reached", () => {
    expect(derive({ overdraftLimit: 0 })).toMatchObject({
      percent: 0,
      tone: "ok",
    });
  });

  test("no limit has no meter to fill and nothing left to count", () => {
    expect(
      derive({ debt: 300, overdraftLimit: undefined, planDefaultLimit: null }),
    ).toMatchObject({
      limit: null,
      limitValue: null,
      left: null,
      percent: 0,
      tone: "ok",
      planDefault: null,
      used: { amount: "300", money: "$6.00" },
    });
  });

  test("the plan's lock and allowEdit each make it read-only", () => {
    expect(derive({ canChangeLimit: false })).toMatchObject({
      source: "plan",
      editable: false,
      planLocked: true,
      canReset: false,
    });
    expect(
      derive(
        { companyLimit: 2000, limitSource: "company" },
        { allowEdit: false },
      ),
    ).toMatchObject({
      source: "company",
      editable: false,
      planLocked: false,
      canReset: false,
    });
  });

  test("a provider's cap is the limit and the company's maximum", () => {
    expect(
      derive({
        adminLimit: 1500,
        limitSource: "admin",
        maxLimit: 1500,
        overdraftLimit: 1500,
      }),
    ).toMatchObject({
      limit: { amount: "1,500" },
      source: "provider",
      editable: true,
      canRaise: true,
      max: { amount: "1,500" },
      maxFromProvider: true,
      canReset: false,
    });
  });

  test("a company's own limit under a provider's cap can still reset", () => {
    expect(
      derive({
        adminLimit: 3000,
        companyLimit: 2000,
        limitSource: "company",
        maxLimit: 3000,
        overdraftLimit: 2000,
      }),
    ).toMatchObject({
      source: "company",
      maxFromProvider: true,
      canReset: true,
    });
  });

  test("a provider's cap on a plan the company can't change", () => {
    expect(
      derive({
        adminLimit: 1500,
        canChangeLimit: false,
        limitSource: "admin",
        overdraftLimit: 1500,
      }),
    ).toMatchObject({ source: "provider", editable: false, planLocked: true });
  });

  test("money comes from the finer rate, and goes without a rate or currency", () => {
    expect(
      derive({
        overdraftLimit: 2000,
        postpaidRatePerUnit: 0,
        postpaidRatePerUnitDecimal: "0.15",
      }),
    ).toMatchObject({ rate: "$0.0015", limit: { money: "$3.00" } });
    expect(
      derive({ postpaidRatePerUnit: 3, postpaidRatePerUnitDecimal: undefined }),
    ).toMatchObject({ rate: "$0.03", limit: { money: "$150.00" } });
    expect(
      derive({ postpaidRatePerUnit: null, postpaidRatePerUnitDecimal: null }),
    ).toMatchObject({ rate: null, limit: { money: null } });
    expect(derive({ currency: undefined })).toMatchObject({
      rate: null,
      limit: { money: null },
    });
  });

  test("names the reset date when the balance has one", () => {
    const balance = creditBalance({
      creditId: "bcr_ai",
      resetsAt: new Date("2026-12-13T12:00:00Z"),
    });
    expect(derive({}, {}, balance).resetsOn).toBe("Dec 13");
  });

  test("uses the credit's own singular and plural names", () => {
    const balance = creditBalance({
      creditName: "Token",
      creditPluralName: "Tokens",
      creditSingularName: "Token",
    });
    expect(derive({ overdraftLimit: 1 }, {}, balance)).toMatchObject({
      unit: "Token",
      units: "Tokens",
      limit: { amount: "1", units: "Token" },
    });
  });
});

describe("overageMoney", () => {
  test("prices credits at the rate, to the currency's precision", () => {
    expect(overageMoney(1234, creditOverdraft(), L)).toBe("$24.68");
    expect(
      overageMoney(
        7,
        creditOverdraft({ postpaidRatePerUnitDecimal: "0.15" }),
        L,
      ),
    ).toBe("$0.01");
    expect(overageMoney(1000, creditOverdraft({ currency: "jpy" }), L)).toBe(
      "¥2,000",
    );
  });
});

describe("validateOverageLimit", () => {
  const overdraft = creditOverdraft({ maxLimit: 20000 });

  test("reads the number as the locale writes it", () => {
    expect(validateOverageLimit("2,000", overdraft, L)).toEqual({
      value: 2000,
    });
    expect(validateOverageLimit(" 1500.5 ", overdraft, L)).toEqual({
      value: 1500.5,
    });
    expect(validateOverageLimit("2.000", overdraft, "de-DE")).toEqual({
      value: 2000,
    });
    expect(validateOverageLimit("12 000,5", overdraft, "fr-FR")).toEqual({
      value: 12000.5,
    });
  });

  test("refuses nothing, zero, negatives and words", () => {
    for (const text of ["", "0", "-5", "abc", "1e3", "2,000 credits"]) {
      expect(validateOverageLimit(text, overdraft, L)).toEqual({
        error: "invalid",
      });
    }
  });

  test("refuses more than the plan's maximum, and allows any without one", () => {
    expect(validateOverageLimit("20000", overdraft, L)).toEqual({
      value: 20000,
    });
    expect(validateOverageLimit("20001", overdraft, L)).toEqual({
      error: "aboveMax",
    });
    expect(
      validateOverageLimit("1000000", creditOverdraft({ maxLimit: null }), L),
    ).toEqual({ value: 1000000 });
  });
});

describe("overageLimitInputText", () => {
  test("starts from the limit in force, or empty without one", () => {
    expect(overageLimitInputText(creditOverdraft(), L)).toBe("5,000");
    expect(
      overageLimitInputText(creditOverdraft({ overdraftLimit: null }), L),
    ).toBe("");
  });
});

describe("parseCredits", () => {
  test("is null for anything but a plain number", () => {
    expect(parseCredits("1,234.5", L)).toBe(1234.5);
    expect(parseCredits("1.2.3", L)).toBeNull();
  });
});

describe("serverMessage", () => {
  test("is the server's error text, and nothing for the client's fallback", () => {
    expect(
      serverMessage(
        new SchematicApiError(400, "/x", { error: "limit above maximum" }),
      ),
    ).toBe("limit above maximum");
    expect(serverMessage(new SchematicApiError(500, "/x", null))).toBe(
      undefined,
    );
    expect(serverMessage(new Error("offline"))).toBeUndefined();
    expect(serverMessage(undefined)).toBeUndefined();
  });
});
