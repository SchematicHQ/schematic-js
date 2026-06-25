import { describe, expect, it } from "vitest";

import { BillingCreditAutoTopupAvailability } from "../../api/checkoutexternal";
import { isAutoTopupOff, isBundlePurchaseOff } from "./credit";

describe("isAutoTopupOff", () => {
  it("returns true when availability is off", () => {
    expect(
      isAutoTopupOff({
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.Off,
      }),
    ).toBe(true);
  });

  it("returns false for automatic and user_controlled", () => {
    expect(
      isAutoTopupOff({
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.Automatic,
      }),
    ).toBe(false);
    expect(
      isAutoTopupOff({
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.UserControlled,
      }),
    ).toBe(false);
  });

  it("treats a missing availability as not off (legacy grants)", () => {
    expect(isAutoTopupOff(undefined)).toBe(false);
    expect(isAutoTopupOff({})).toBe(false);
    expect(isAutoTopupOff({ billingCreditAutoTopupAvailability: null })).toBe(
      false,
    );
  });
});

describe("isBundlePurchaseOff", () => {
  it("returns true when can buy bundles is false", () => {
    expect(isBundlePurchaseOff({ billingCreditCanBuyBundles: false })).toBe(
      true,
    );
  });

  it("returns false when can buy bundles is true", () => {
    expect(isBundlePurchaseOff({ billingCreditCanBuyBundles: true })).toBe(
      false,
    );
  });

  it("treats a missing value as not off (legacy grants)", () => {
    expect(isBundlePurchaseOff(undefined)).toBe(false);
    expect(isBundlePurchaseOff({})).toBe(false);
  });
});

describe("bundle purchase and auto top-up are independent", () => {
  it("bundle purchase off does not imply auto top-up off", () => {
    const grant = {
      billingCreditCanBuyBundles: false,
      billingCreditAutoTopupAvailability:
        BillingCreditAutoTopupAvailability.Automatic,
    };
    expect(isBundlePurchaseOff(grant)).toBe(true);
    expect(isAutoTopupOff(grant)).toBe(false);
  });

  it("auto top-up off does not imply bundle purchase off", () => {
    const grant = {
      billingCreditCanBuyBundles: true,
      billingCreditAutoTopupAvailability:
        BillingCreditAutoTopupAvailability.Off,
    };
    expect(isBundlePurchaseOff(grant)).toBe(false);
    expect(isAutoTopupOff(grant)).toBe(true);
  });
});
