import { describe, expect, it } from "vitest";

import { hasTaxIdValue, isStripeTestTaxId, toTaxIdInput } from "./taxIds";

describe("isStripeTestTaxId", () => {
  // The predicate exists to suppress the "doesn't match the expected format"
  // hint in test mode. Getting it wrong in either direction is a support
  // ticket: too narrow and every test-mode tax ID looks broken, too wide and a
  // real typo sails through unflagged.
  it.each([
    ["eu_vat", "000000000"],
    ["eu_vat", "111111111"],
    ["eu_vat", "222222222"],
    ["gb_vat", "GB000000000"],
    ["au_abn", "au222222222"],
  ])("treats %s %s as a magic test value", (stripeType, value) => {
    expect(isStripeTestTaxId(stripeType, value)).toBe(true);
  });

  it.each([
    // Only the three verified types get magic values; us_ein has no
    // verification flow, so 000000000 there is just a wrong number.
    ["us_ein", "000000000"],
    ["ca_gst_hst", "111111111"],
    // Off by one from a magic value.
    ["eu_vat", "000000001"],
    // The prefix strip is anchored to the start, so a trailing country code
    // is not a magic value.
    ["gb_vat", "000000000GB"],
    ["gb_vat", ""],
    ["gb_vat", "GB123456789"],
  ])("treats %s %s as an ordinary value", (stripeType, value) => {
    expect(isStripeTestTaxId(stripeType, value)).toBe(false);
  });
});

describe("toTaxIdInput", () => {
  it("builds a payload from a complete pair and trims the value", () => {
    expect(
      toTaxIdInput({ country: "DE", type: "eu_vat", value: " DE123456789 " }),
    ).toEqual({ type: "eu_vat", value: "DE123456789" });
  });

  it.each([
    ["missing type", { country: "DE", type: "", value: "DE123456789" }],
    ["missing value", { country: "DE", type: "eu_vat", value: "" }],
    ["whitespace value", { country: "DE", type: "eu_vat", value: "   " }],
  ])("returns undefined for an incomplete pair (%s)", (_label, values) => {
    expect(toTaxIdInput(values)).toBeUndefined();
    expect(hasTaxIdValue(values)).toBe(false);
  });
});
