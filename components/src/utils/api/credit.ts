import { type CreditCompanyGrantView } from "../../api/checkoutexternal";
import type { Credit } from "../../types";
import { pluralize } from "../pluralize";

interface GroupCreditGrantOptions {
  groupBy?: "credit" | "plan" | "bundle";
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
          options?.groupBy === "bundle" && grant.billingCreditBundleId
            ? grant.billingCreditBundleId
            : options?.groupBy === "plan" && grant.planId
              ? grant.planId
              : grant.billingCreditId;
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
            value: (current?.total.value ?? 0) + grant.quantity,
            remaining:
              (current?.total.remaining ?? 0) + grant.quantityRemaining,
            used: (current?.total.used ?? 0) + grant.quantityUsed,
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

/* export function groupCreditGrants(creditGrants: CreditCompanyGrantView[]) {
  const credits = getCredits(creditGrants);

  const map = credits.reduce(
    (
      acc: {
        [key: string]: CreditCompanyGrantView & { count: number };
      },
      credit,
    ) => {
      credit.grants.forEach((grant) => {
        const key = grant.billingCreditBundleId || grant.id;
        const current = acc[key];
        acc[key] = { ...grant, count: (current?.count ?? 0) + 1 };
      });

      return acc;
    },
    {},
  );

  return Object.values(map).sort((a, b) => a.count - b.count);
} */

export function getCreditName(
  credit: Pick<
    CreditCompanyGrantView,
    "creditName" | "singularName" | "pluralName"
  >,
  count = 0,
) {
  const shouldBePlural = count === 0 || count > 1;
  const { creditName: name, singularName, pluralName } = credit;

  if (pluralName && shouldBePlural) {
    return pluralName;
  }

  if (singularName) {
    return shouldBePlural ? pluralize(singularName, count) : singularName;
  }

  return pluralize(name, count);
}
