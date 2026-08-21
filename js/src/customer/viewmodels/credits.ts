import {
  type CompanyCreditBalanceEntryResponseData,
  type CompanyCreditGrantResponseData,
} from "../api/customer";

import { formatDate, formatNumber, type FormatOptions } from "./format";

/**
 * Where a grant came from, as structured parts: the reason enum plus the
 * plan or bundle it traces back to. Consumers assemble the label.
 */
export interface CreditGrantSource {
  bundleId?: string;
  bundleName?: string;
  planId?: string;
  planName?: string;
  /** plan | bundle | manual | auto_topup | rollover | … */
  reason: string;
}

export interface CreditGrantEntry {
  expiresAt?: Date;
  formattedExpiresAt?: string;
  formattedQuantity: string;
  formattedRemaining: string;
  id: string;
  quantity: number;
  remaining: number;
  renewalPeriod?: string;
  source: CreditGrantSource;
  used: number;
}

export interface CreditBalanceSummary {
  creditDescription: string;
  creditIcon?: string;
  creditId: string;
  creditName: string;
  creditPluralName?: string;
  creditSingularName?: string;
  /** Earliest upcoming grant expiry, when any grant expires. */
  expiresAt?: Date;
  formattedExpiresAt?: string;
  formattedRemaining: string;
  formattedTotal: string;
  formattedUsed: string;
  /** The grant ledger, for drill-down display. */
  grants: CreditGrantEntry[];
  /** Burndown fill percentage, clamped to [0, 100]. */
  percentUsed: number;
  remaining: number;
  total: number;
  used: number;
}

/**
 * Derives the credit balances from the server-grouped ledger (expired and
 * zeroed-out grants are already excluded server-side).
 */
export const deriveCreditBalances = (
  balances: CompanyCreditBalanceEntryResponseData[],
  options: FormatOptions = {},
): CreditBalanceSummary[] => {
  return balances.map((balance) => ({
    creditDescription: balance.creditDescription,
    ...(balance.creditIcon != null ? { creditIcon: balance.creditIcon } : {}),
    creditId: balance.creditId,
    creditName: balance.creditName,
    ...(balance.creditPluralName != null
      ? { creditPluralName: balance.creditPluralName }
      : {}),
    ...(balance.creditSingularName != null
      ? { creditSingularName: balance.creditSingularName }
      : {}),
    ...(balance.expiresAt != null
      ? {
          expiresAt: balance.expiresAt,
          formattedExpiresAt: formatDate(balance.expiresAt, options),
        }
      : {}),
    formattedRemaining: formatNumber(balance.remaining, options),
    formattedTotal: formatNumber(balance.total, options),
    formattedUsed: formatNumber(balance.used, options),
    grants: balance.grants.map((grant) => buildGrant(grant, options)),
    percentUsed:
      balance.total > 0
        ? Math.max(0, Math.min(100, (balance.used / balance.total) * 100))
        : 0,
    remaining: balance.remaining,
    total: balance.total,
    used: balance.used,
  }));
};

const buildGrant = (
  grant: CompanyCreditGrantResponseData,
  options: FormatOptions,
): CreditGrantEntry => {
  const source: CreditGrantSource = { reason: grant.grantReason };
  if (grant.bundleId != null) {
    source.bundleId = grant.bundleId;
  }
  if (grant.bundleName != null) {
    source.bundleName = grant.bundleName;
  }
  if (grant.planId != null) {
    source.planId = grant.planId;
  }
  if (grant.planName != null) {
    source.planName = grant.planName;
  }
  const vm: CreditGrantEntry = {
    formattedQuantity: formatNumber(grant.quantity, options),
    formattedRemaining: formatNumber(grant.quantityRemaining, options),
    id: grant.id,
    quantity: grant.quantity,
    remaining: grant.quantityRemaining,
    source,
    used: grant.quantityUsed,
  };
  if (grant.expiresAt != null) {
    vm.expiresAt = grant.expiresAt;
    vm.formattedExpiresAt = formatDate(grant.expiresAt, options);
  }
  if (grant.renewalPeriod != null) {
    vm.renewalPeriod = grant.renewalPeriod;
  }
  return vm;
};
