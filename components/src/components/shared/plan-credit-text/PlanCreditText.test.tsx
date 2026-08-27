import { screen } from "@testing-library/react";

import { render } from "../../../test/setup";
import type { Credit } from "../../../types";

import { PlanCreditText } from "./PlanCreditText";

function makeCredit(overrides: Partial<Credit> = {}): Credit {
  return {
    id: "credit-1",
    name: "Credits",
    singularName: "Credit",
    pluralName: "Credits",
    description: "",
    icon: undefined,
    grantReason: "plan",
    quantity: 0,
    fixedQuantity: 0,
    perLicenseGrants: [],
    planId: "plan-1",
    planName: undefined,
    period: "month",
    ...overrides,
  };
}

const seatEntitlements = [
  {
    feature: {
      licenseId: "license-1",
      name: "User Seat",
      singularName: "User Seat",
      pluralName: "User Seats",
    },
  },
];

describe("`PlanCreditText` component", () => {
  it("renders a per-license grant as a per-seat value prop", () => {
    render(
      <PlanCreditText
        credit={makeCredit({
          perLicenseGrants: [{ amount: 100, licenseId: "license-1" }],
        })}
        entitlements={seatEntitlements}
      />,
    );

    expect(
      screen.getByText("100 Credits per User Seat per month"),
    ).toBeInTheDocument();
  });

  it("adds the company grant line when a fixed portion exists on the same credit", () => {
    render(
      <PlanCreditText
        credit={makeCredit({
          quantity: 500,
          fixedQuantity: 500,
          perLicenseGrants: [{ amount: 100, licenseId: "license-1" }],
        })}
        entitlements={seatEntitlements}
      />,
    );

    expect(
      screen.getByText("100 Credits per User Seat per month"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("+ 500 Credits per month for your company"),
    ).toBeInTheDocument();
  });

  it("names the plan's only license when the grant names none", () => {
    render(
      <PlanCreditText
        credit={makeCredit({
          quantity: 500,
          fixedQuantity: 500,
          perLicenseGrants: [{ amount: 7000 }],
        })}
        entitlements={seatEntitlements}
      />,
    );

    expect(
      screen.getByText("7000 Credits per User Seat per month"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("+ 500 Credits per month for your company"),
    ).toBeInTheDocument();
  });

  it("falls back to the generic license word when the license is ambiguous", () => {
    render(
      <PlanCreditText
        credit={makeCredit({
          perLicenseGrants: [{ amount: 7000 }],
        })}
        entitlements={[
          ...seatEntitlements,
          {
            feature: {
              licenseId: "license-2",
              name: "Agent",
              singularName: "Agent",
              pluralName: "Agents",
            },
          },
        ]}
      />,
    );

    expect(
      screen.getByText("7000 Credits per license per month"),
    ).toBeInTheDocument();
  });

  it("renders one line per license when a credit scales by several", () => {
    render(
      <PlanCreditText
        credit={makeCredit({
          perLicenseGrants: [
            { amount: 100, licenseId: "license-1" },
            { amount: 40, licenseId: "license-2" },
          ],
        })}
        entitlements={[
          ...seatEntitlements,
          {
            feature: {
              licenseId: "license-2",
              name: "Agent",
              singularName: "Agent",
              pluralName: "Agents",
            },
          },
        ]}
      />,
    );

    expect(
      screen.getByText("100 Credits per User Seat per month"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("40 Credits per Agent per month"),
    ).toBeInTheDocument();
  });

  it("keeps the flat copy for fixed-only grants", () => {
    render(
      <PlanCreditText
        credit={makeCredit({ quantity: 500, fixedQuantity: 500 })}
        entitlements={seatEntitlements}
      />,
    );

    expect(screen.getByText(/500\s+Credits\s+per\s+month/)).toBeInTheDocument();
  });
});
