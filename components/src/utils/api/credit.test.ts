import { describe, expect, it } from "vitest";

import { BillingCreditAutoTopupAvailability } from "../../api/checkoutexternal";
import { isTopupOff } from "./credit";

describe("isTopupOff", () => {
  it("returns true when availability is off", () => {
    expect(
      isTopupOff({
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.Off,
      }),
    ).toBe(true);
  });

  it("returns false for automatic and user_controlled", () => {
    expect(
      isTopupOff({
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.Automatic,
      }),
    ).toBe(false);
    expect(
      isTopupOff({
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.UserControlled,
      }),
    ).toBe(false);
  });

  it("treats a missing availability as not off (legacy grants)", () => {
    expect(isTopupOff(undefined)).toBe(false);
    expect(isTopupOff({})).toBe(false);
    expect(isTopupOff({ billingCreditAutoTopupAvailability: null })).toBe(
      false,
    );
  });
});
