import { type CheckFlagReturn } from "@schematichq/schematic-js";

import { deriveUsage } from "./controller";

function entitlement(over: Partial<CheckFlagReturn>): CheckFlagReturn {
  return {
    flag: "seats",
    reason: "test",
    value: true,
    ...over,
  } as CheckFlagReturn;
}

describe("deriveUsage", () => {
  it("computes usage/allocation/percent when both are numeric", () => {
    expect(
      deriveUsage(entitlement({ featureUsage: 42, featureAllocation: 100 })),
    ).toEqual({
      flag: "seats",
      usage: 42,
      allocation: 100,
      percent: 42,
      hasData: true,
    });
  });

  it("rounds percent to two decimals", () => {
    expect(
      deriveUsage(entitlement({ featureUsage: 1, featureAllocation: 3 }))
        .percent,
    ).toBe(33.33);
  });

  it("clamps percent to the 0–100 range", () => {
    expect(
      deriveUsage(entitlement({ featureUsage: 150, featureAllocation: 100 }))
        .percent,
    ).toBe(100);
  });

  it("returns percent 0 when allocation is 0", () => {
    expect(
      deriveUsage(entitlement({ featureUsage: 5, featureAllocation: 0 }))
        .percent,
    ).toBe(0);
  });

  it("reports no data when usage or allocation is missing", () => {
    expect(
      deriveUsage(entitlement({ featureUsage: 42, featureAllocation: null })),
    ).toMatchObject({ hasData: false, percent: 0, allocation: undefined });

    expect(
      deriveUsage(entitlement({ featureUsage: null, featureAllocation: 100 })),
    ).toMatchObject({ hasData: false, percent: 0, usage: undefined });
  });
});
