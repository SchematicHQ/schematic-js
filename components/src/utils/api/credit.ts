import {
  type CreditCompanyGrantView,
  type PlanCreditGrantView,
} from "../../api/checkoutexternal";
import { CreditResetCadence } from "../../const";
import type { Credit } from "../../types";

function getResetCadencePeriod(cadence: string) {
  switch (cadence) {
    case CreditResetCadence.Year:
      return "year";
    case CreditResetCadence.Month:
      return "month";
    case CreditResetCadence.Week:
      return "week";
    case CreditResetCadence.Day:
      return "day";
  }
}

export function groupPlanCreditGrants(creditGrants: PlanCreditGrantView[]) {
  const map = creditGrants.reduce(
    (
      acc: {
        [key: string]: Omit<
          Credit,
          "companyId" | "companyName" | "bundleId" | "total" | "grants"
        > & { period?: string };
      },
      grant,
    ) => {
      const key = grant.creditId;

      acc[key] = {
        id: grant.creditId,
        name: grant.creditName,
        singularName: grant.singularName,
        pluralName: grant.pluralName,
        description: grant.creditDescription,
        icon: grant.creditIcon,
        grantReason: "plan",
        quantity: grant.creditAmount,
        planId: grant.planId,
        planName: grant.planName,
        period: getResetCadencePeriod(grant.resetCadence),
      };

      return acc;
    },
    {},
  );

  return Object.values(map);
}

interface GroupCreditGrantOptions {
  groupBy?: "credit" | "bundle";
}

export function groupCreditGrants(
  creditGrants: CreditCompanyGrantView[],
  options?: GroupCreditGrantOptions,
) {
  const today = new Date();
  const map = creditGrants.reduce(
    (
      acc: {
        [key: string]: Credit;
      },
      grant,
    ) => {
      const isExpired = !!grant.expiresAt && grant.expiresAt <= today;
      const isZeroedOut = !!grant.zeroedOutDate;

      if (!isExpired && !isZeroedOut) {
        const key =
          options?.groupBy === "bundle"
            ? grant.billingCreditBundleId || grant.id
            : options?.groupBy === "credit"
              ? grant.billingCreditId
              : grant.id;
        const current = acc[key];

        acc[key] = {
          // credit-specific attributes
          id: grant.billingCreditId,
          name: grant.creditName,
          singularName: grant.singularName,
          pluralName: grant.pluralName,
          description: grant.creditDescription,
          icon: grant.creditIcon,
          grantReason: grant.grantReason,
          quantity: grant.quantity,
          // shared attributes
          companyId: grant.companyId,
          companyName: grant.companyName,
          planId: grant.planId,
          planName: grant.planName,
          bundleId: grant.billingCreditBundleId,
          // custom attributes
          total: {
            value: (current?.total?.value ?? 0) + grant.quantity,
            remaining:
              (current?.total?.remaining ?? 0) + grant.quantityRemaining,
            used: (current?.total?.used ?? 0) + grant.quantityUsed,
          },
          grants: [...(current?.grants ?? []), grant],
        };
      }

      return acc;
    },
    {},
  );

  return Object.values(map);
}
