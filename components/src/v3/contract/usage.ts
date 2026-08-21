/**
 * `GET /company/usage` — one row per entitlement the company holds: the
 * entitlement display block plus usage facts.
 */

import type { EntitlementDisplay } from "./catalog";
import type { EntitlementSource } from "./enums";

export interface FeatureUsageRow extends EntitlementDisplay {
  /** `plan` or `company` override. IncludedFeatures (row key). */
  source: EntitlementSource;
  /** When `source` is `plan`. IncludedFeatures, MeteredFeatures (row key). */
  planEntitlementId: string | null;
  /** When `source` is `company`. Same readers. */
  companyOverrideId: string | null;
  /** Whether the company currently has access. IncludedFeatures. */
  access: boolean;
  /** Units used in the current metric period. IncludedFeatures, MeteredFeatures. */
  usage: number;
  /** The limit in force after overrides; `null` = unlimited. IncludedFeatures, MeteredFeatures. */
  effectiveLimit: number | null;
  /** `usage ÷ effectiveLimit × 100`, server-computed; `null` when unlimited. MeteredFeatures. */
  percentUsed: number | null;
  /** Next reset of the metric period; `null` when not periodic. IncludedFeatures, MeteredFeatures. */
  resetsAt: Date | null;
  /**
   * When a company-override entitlement expires; `null` = never. Not in RFC
   * 0007 (`entitlement_expiration_date` on the hydrate row). IncludedFeatures.
   */
  expiresAt: Date | null;
  /** Billable cost so far this period in minor units; `null` when nothing is billable. MeteredFeatures, IncludedFeatures. */
  currentCost: number | null;
  /** ISO 4217 of `currentCost`; `null` whenever it is. Same readers. */
  currentCostCurrency: string | null;
}
