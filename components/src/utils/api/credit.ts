import { type CreditCompanyGrantView } from "../../api/checkoutexternal";
import type { Credit } from "../../types";

export function getCredits(creditGrants: CreditCompanyGrantView[]) {
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
        const current = acc[grant.billingCreditId];
        acc[grant.billingCreditId] = {
          id: grant.billingCreditId,
          name: grant.creditName,
          description: grant.creditDescription,
          icon: grant.creditIcon || undefined,
          quantity: {
            value: (current?.quantity.value ?? 0) + grant.quantity,
            remaining:
              (current?.quantity.remaining ?? 0) + grant.quantityRemaining,
            used: (current?.quantity.used ?? 0) + grant.quantityUsed,
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
