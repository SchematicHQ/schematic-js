import { type CreditCompanyGrantView } from "../../api/checkoutexternal";
import type { Credit } from "../../types";

export function getCredits(grants: CreditCompanyGrantView[]) {
  const today = new Date();
  const map = grants.reduce(
    (
      acc: {
        [key: string]: Credit;
      },
      grant,
    ) => {
      if (grant.expiresAt && grant.expiresAt > today) {
        const current = acc[grant.billingCreditId];
        acc[grant.billingCreditId] = {
          id: grant.billingCreditId,
          name: grant.creditName,
          quantity: {
            remaining:
              (current?.quantity.remaining ?? 0) + grant.quantityRemaining,
            used: (current?.quantity.used ?? 0) + grant.quantityUsed,
          },
        };
      }

      return acc;
    },
    {},
  );

  return Object.values(map);
}
