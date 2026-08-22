/**
 * `GET /company/credits` — the credit ledger grouped by credit, with expired
 * and zeroed-out grants excluded server-side.
 */

import type { CreditRef } from "./catalog";
import type { CreditGrantReason, CreditResetCadence } from "./enums";

export interface CreditGrantRow {
  id: string;
  /** Why the grant exists. CreditUsage ledger, PlanManager (purchased/free/auto top-up sections). */
  reason: CreditGrantReason;
  /** The plan that granted it, for `plan` grants. CreditUsage ledger. */
  plan: { id: string; name: string } | null;
  /** The bundle bought, for `purchased` / auto top-up grants. CreditUsage ledger, PlanManager. */
  bundle: { id: string; name: string } | null;
  /** Credits granted. CreditUsage, PlanManager. */
  quantity: number;
  quantityUsed: number;
  quantityRemaining: number;
  /** Renewal cadence, when the grant renews. CreditUsage. */
  renewalPeriod: CreditResetCadence | null;
  /** Newest-first ordering key. CreditUsage, PlanManager. */
  createdAt: Date;
  validFrom: Date | null;
  /** CreditUsage ledger. */
  expiresAt: Date | null;
}

export interface CreditBalanceEntry {
  credit: CreditRef & { description: string };
  /** Sum of `quantity` over live grants. CreditUsage meter. */
  total: number;
  /** CreditUsage meter. */
  used: number;
  /** CreditUsage meter. */
  remaining: number;
  /** Earliest upcoming grant expiry; `null` = none. CreditUsage. */
  expiresAt: Date | null;
  /** Live grants, newest first. CreditUsage ledger, PlanManager. */
  grants: CreditGrantRow[];
}
