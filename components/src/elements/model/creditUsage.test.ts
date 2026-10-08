import { creditBalance, creditGrant } from "../fixtures/builders";

import { deriveCreditUsage } from "./creditUsage";

const L = "en-US";

describe("deriveCreditUsage", () => {
  test("words each grant by why it was given, and dates it by what ends", () => {
    const [row] = deriveCreditUsage(
      [
        creditBalance({
          grants: [
            creditGrant({ grantReason: "plan" }),
            creditGrant({ grantReason: "purchased", quantity: 50 }),
            creditGrant({ grantReason: "billing_credit_auto_topup" }),
            creditGrant({
              grantReason: "free",
              resetsAt: undefined,
              expiresAt: undefined,
            }),
          ],
        }),
      ],
      { locale: L },
    );
    expect(row.ledger.map((g) => g.kind)).toEqual([
      "plan",
      "bundle",
      "autoTopup",
      "promotional",
    ]);
    expect(row.ledger[0].date?.kind).toBe("resets");
    expect(row.ledger[1].item).toBe("AI credit");
    expect(row.ledger[3].date).toBeNull();
  });

  test("names the renewal day as an ordinal", () => {
    const composition = (day: number) =>
      deriveCreditUsage(
        [
          creditBalance({
            composition: {
              fixedQuantity: 0,
              licenseName: "Seat",
              licenseQuantity: 1,
              perLicenseAmount: 10,
              period: "month",
              renewsAt: new Date(2026, 8, day, 12),
              total: 10,
            },
          }),
        ],
        { locale: L },
      )[0].composition;
    expect(composition(1)?.renewsOn).toBe("1st");
    expect(composition(2)?.renewsOn).toBe("2nd");
    expect(composition(23)?.renewsOn).toBe("23rd");
    expect(composition(11)?.renewsOn).toBe("11th");
    expect(composition(1)?.companyGrant).toBeNull();
  });

  test("keeps a small remainder rather than rounding it away", () => {
    const [row] = deriveCreditUsage(
      [creditBalance({ remaining: 0.0000000123 })],
      { locale: L },
    );
    expect(row.remaining.amount).toBe("0.0000000123");
    const [granted] = deriveCreditUsage(
      [creditBalance({ grants: [creditGrant({ quantity: 0.0005 })] })],
      { locale: L },
    );
    expect(granted.ledger[0].amount).toBe("0.0005");
  });

  test("formats the ledger and composition counts", () => {
    const [row] = deriveCreditUsage(
      [
        creditBalance({
          grants: [creditGrant({ grantReason: "plan", quantity: 10000 })],
          composition: {
            fixedQuantity: 5000,
            licenseName: "Seat",
            licenseQuantity: 1200,
            perLicenseAmount: 1000,
            period: "month",
            renewsAt: new Date(2026, 8, 1, 12),
            total: 1205000,
          },
        }),
      ],
      { locale: L },
    );
    expect(row.ledger[0].amount).toBe("10,000");
    expect(row.composition).toMatchObject({
      total: "1,205,000",
      perLicense: { quantity: "1,200", perUnit: "1,000" },
      companyGrant: "5,000",
    });
  });

  test("visibleCredits orders and filters", () => {
    const rows = deriveCreditUsage(
      [creditBalance({ creditId: "a" }), creditBalance({ creditId: "b" })],
      { locale: L, visibleCredits: ["b", "missing"] },
    );
    expect(rows.map((r) => r.creditId)).toEqual(["b"]);
  });
});
