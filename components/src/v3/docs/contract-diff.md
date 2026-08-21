# Contract diff: v3 elements vs RFC 0007

The v3 elements were built against a TypeScript contract derived from what
they render (`src/v3/contract/`). This document maps that contract onto the
shapes in RFC 0007 (`docs/docs/RFCs/0007-catalog-response-types.md` in
schematic-api) field by field. It is the deliverable back to the API side:
every line is justified by a named element, and "dropped" means no element
reads the field.

Buckets: **same** (name and meaning match, modulo camelCase and `Date`),
**renamed / reshaped**, **added** (with the element that needs it),
**dropped**, **semantics differ**.

Conventions the stub assumes of the wire format: snake_case JSON, RFC3339
timestamps, minor-unit integers with a `…_decimal` string sibling where the
provider stores sub-unit amounts, `null` for absent (never omitted keys),
enums as the strings the API already emits.

## Routes and resources

| Resource (`CatalogResources`) | RFC 0007 route                                                           | Notes                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog`                     | `GET /public/catalog[s/:id]`, `GET /catalog/view` · `/catalogs/:id/view` | Same. One hook; the client picks the public or company form from its credentials.                                                                                                        |
| `company`                     | `GET /company`                                                           | Same.                                                                                                                                                                                    |
| `usage`                       | `GET /company/usage`                                                     | Same; the element reads the `rows` array.                                                                                                                                                |
| `credits`                     | `GET /company/credits`                                                   | Same; the element reads the `balances` array.                                                                                                                                            |
| `invoices`                    | `GET /company/invoices?limit&offset&include_pending`                     | Same. The page shape `{ invoices, hasMore }` is client-side: the client requests `limit + 1`.                                                                                            |
| `upcomingInvoice`             | `GET /company/upcoming-invoice`                                          | **Semantics differ:** the stub allows `null` (no subscription to invoice); the RFC does not say what the route returns without a subscription. Proposal: `204`/`null` rather than `404`. |

The granularity the elements settled on matches the RFC's `/company` +
siblings split: PricingTable reads `catalog` only; PlanManager reads
`company` + `catalog`; IncludedFeatures and MeteredFeatures read `usage`
(+ `company` for the period, + `catalog` for checkout capability);
CreditUsage reads `credits` + `catalog` + `company`; Invoices reads
`invoices`; UpcomingBill reads `upcomingInvoice` + `company`. No element
needed a resource the RFC does not have, and no RFC resource went unused.

## `CatalogPriceOutput` → `Price`

| Stub                        | RFC                          | Bucket  | Why                                                                                             |
| --------------------------- | ---------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `id`                        | `id`                         | same    | `onSelectPlan` hands the price id to checkout                                                   |
| `currency`                  | `currency`                   | same    |                                                                                                 |
| `interval`, `intervalCount` | `interval`, `interval_count` | same    | `derivePeriod`                                                                                  |
| `amount`                    | `price`                      | renamed | "amount" beside "currency" reads as money; `price` on a `Price` is redundant                    |
| `amountDecimal`             | `price_decimal`              | renamed | as above                                                                                        |
| `packageSize`               | `package_size`               | same    |                                                                                                 |
| `scheme`                    | `scheme`                     | same    |                                                                                                 |
| `tiersMode`                 | `tiers_mode`                 | same    |                                                                                                 |
| `tiers`                     | `price_tiers`                | renamed |                                                                                                 |
| —                           | `overage_unit_price_decimal` | dropped | the overage rate is the last tier; `overageTier()` reads it, so a precomputed copy is redundant |

### `CatalogPriceTierOutput` → `PriceTier`

| Stub                                    | RFC                                        | Bucket           |
| --------------------------------------- | ------------------------------------------ | ---------------- |
| `from`, `to`                            | `from`, `to`                               | same             |
| `perUnitAmount`, `perUnitAmountDecimal` | `per_unit_price`, `per_unit_price_decimal` | renamed (amount) |
| `flatAmount`                            | `flat_price`                               | renamed (amount) |

## Price slots → `prices: Price[]` (reshaped)

RFC 0007 puts four period slots on a plan (`monthly_price`, `quarterly_price`,
`yearly_price`, `one_time_price`) plus a `currency_prices[]` mirror per extra
currency, and the same on entitlements (`metered_*_price` + `currency_prices`).
The stub replaces both with one flat `prices: Price[]` (plans) /
`meteredPrices: Price[]` (entitlements): every currency × cadence the thing
is sold at, already gated to what is on sale.

Why: every element selects a price by `(currency, period)` and enumerates
the offered periods and currencies; with slots that is two code paths (the
default-currency slots and the mirror) that the v2 code kept getting subtly
wrong (`getPlanPrice` vs `planSupportsCurrency` vs `useAvailableCurrencies`).
A flat list makes `findPrice`, `periodsOf`, and `currenciesOf` one-liners and
removes the need for `available_periods`, `default_currency`'s "first priced
slot" rule, and the RFC's "Period availability" gating contract (the list
simply contains what is sold).

Consequences for the RFC: `available_periods` **dropped** (derivable);
`CatalogCurrencyPricesOutput` **dropped**; `default_currency` **kept** on the
catalog (the initial selection) but its definition simplifies to "the
account's default currency".

## `CatalogPlanOutput` → `CatalogPlan`

| Stub                                | RFC                            | Bucket                        | Why                                    |
| ----------------------------------- | ------------------------------ | ----------------------------- | -------------------------------------- |
| `id`, `name`, `description`, `icon` | same                           | same                          |                                        |
| `chargeType`                        | `charge_type`                  | same                          | one-time vs recurring vs free branches |
| —                                   | `billing_strategy`             | dropped                       | no element branches on it              |
| `prices`                            | four slots + `currency_prices` | reshaped                      | see above                              |
| —                                   | `available_periods`            | dropped                       | derived from `prices`                  |
| `entitlements`                      | `entitlements`                 | same                          |                                        |
| `isTrialable`, `trialDays`          | `is_trialable`, `trial_days`   | same                          |                                        |
| `compatiblePlanIds`                 | `compatible_plan_ids`          | same (null = all, list exact) |                                        |
| `includedCreditGrants`              | `included_credit_grants`       | same                          |                                        |

### `CatalogCompanyPlanOutput` → `CompanyCatalogPlan`

| Stub                                                                      | RFC  | Bucket                   | Why                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------- | ---- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `current`, `valid`, `invalidReason`, `companyCanTrial`, `usageViolations` | same | same                     |                                                                                                                                                                                                                                                                |
| `currentPriceId`                                                          | —    | **added** (PricingTable) | "Current plan" must apply at the subscribed period and currency only; another period of the current plan is a selectable change. Hydrate compared the subscription period client-side; on the catalog view the decoration already knows the subscription line. |

### `CatalogUsageViolationOutput` → `UsageViolation` — same.

## `CatalogEntitlementOutput` → `EntitlementDisplay`

| Stub                                                                                             | RFC                                                                                                                                    | Bucket                                | Why                                                                                                                       |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `feature: { id, name, singularName, pluralName, icon, description, type }`                       | `feature_id`, `feature_name`, `feature_singular_name`, `feature_plural_name`, `feature_icon`, `feature_description`, `feature_type`    | reshaped (nested)                     | the same identity block is reused by `FeatureRef` everywhere; `icon`/`description` are `null` when unset rather than `""` |
| —                                                                                                | `license_id`                                                                                                                           | dropped                               | per-license credit lines resolve the license feature through the grant's `license_id`, not the entitlement's              |
| `valueType`, `valueBool`, `valueNumeric`                                                         | `value_type`, `value_bool`, `value_numeric`                                                                                            | same                                  |                                                                                                                           |
| `priceBehavior`                                                                                  | `price_behavior`                                                                                                                       | same                                  |                                                                                                                           |
| `meteredPrices`                                                                                  | `metered_monthly_price`, `metered_quarterly_price`, `metered_yearly_price`, `currency_prices`                                          | reshaped (flat list)                  | see price slots                                                                                                           |
| `softLimit`                                                                                      | `soft_limit`                                                                                                                           | same                                  |                                                                                                                           |
| `credit: { id, name, singularName, pluralName, icon, consumptionRate, equivalentLimit } \| null` | `consumption_rate`, `credit_id`, `credit_name`, `credit_singular_name`, `credit_plural_name`, `credit_icon`, `credit_equivalent_limit` | reshaped (nested, nullable as a unit) | the seven credit fields are present together or not at all; one nullable object says so in the type                       |
| `metricPeriod`, `metricPeriodMonthReset`                                                         | `metric_period`, `metric_period_month_reset`                                                                                           | same                                  |                                                                                                                           |
| `warningThreshold`                                                                               | `warning_threshold`                                                                                                                    | same                                  |                                                                                                                           |

`CatalogPlanEntitlementOutput { id } + block` → `Entitlement` — same.

## `CatalogCreditGrantOutput` → `CreditGrant`

| Stub                                   | RFC                                                                                     | Bucket            |
| -------------------------------------- | --------------------------------------------------------------------------------------- | ----------------- |
| `id`                                   | `id`                                                                                    | same              |
| `credit: CreditRef`                    | `credit_id`, `credit_name`, `credit_singular_name`, `credit_plural_name`, `credit_icon` | reshaped (nested) |
| `amount`                               | `credit_amount`                                                                         | renamed           |
| `companyAmount`                        | `company_credit_amount`                                                                 | renamed           |
| `scaling`, `licenseId`, `resetCadence` | same                                                                                    | same              |

## `CatalogCreditBundleOutput` → `CreditBundle`

| Stub                                     | RFC                                                                                     | Bucket                       | Why                                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `id`, `name`                             | same                                                                                    | same                         |                                                                                                          |
| `credit: CreditRef`                      | `credit_id`, `credit_name`, `credit_singular_name`, `credit_plural_name`, `credit_icon` | reshaped                     |                                                                                                          |
| —                                        | `bundle_type`                                                                           | dropped                      | always `fixed`; `quantity === null` already encodes custom-quantity                                      |
| `quantity`                               | `quantity`                                                                              | same                         |                                                                                                          |
| `prices: Price[]`, `unitPrices: Price[]` | `price`, `unit_price`, `currency_prices[]`                                              | reshaped (flat per currency) | same rationale as plan prices                                                                            |
| `compatiblePlanIds`                      | —                                                                                       | **added** (CreditUsage)      | "Buy more" must not offer a bundle checkout would reject; hydrate's `BillingCreditBundleView` carries it |
| `expiry: { type, unit, unitCount }`      | `expiry_type`, `expiry_unit`, `expiry_unit_count`                                       | reshaped (nested)            |                                                                                                          |

## Top-level catalog

| Stub                                              | RFC                                                 | Bucket                         | Why                          |
| ------------------------------------------------- | --------------------------------------------------- | ------------------------------ | ---------------------------- |
| `id`, `name`, `description`, `pricingUrl`         | same                                                | same                           |                              |
| —                                                 | `pricing_model`                                     | dropped                        | no element reads it          |
| `customPlanCta: { text, url, priceText } \| null` | `custom_plan_cta { cta_text, cta_url, price_text }` | renamed fields                 |                              |
| `capabilities: { checkout }`                      | `capabilities { badge_visibility, checkout }`       | **dropped `badge_visibility`** | v3 has no badge (embed-only) |
| `defaultCurrency`                                 | `default_currency`                                  | same (definition simplifies)   |                              |
| `plans`, `addOns`, `creditBundles`                | same                                                | same                           |                              |

### `CatalogCheckoutBehaviorOutput` → `CheckoutBehavior` (company catalog)

| Stub                                                 | RFC                                                                               | Bucket  | Why                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- | ------- | --------------------------------------------- |
| `preventSelfServiceDowngrade`, `…ButtonText`, `…Url` | same                                                                              | same    |                                               |
| `trialExpiryPlan`                                    | `trial_expiry_plan`                                                               | same    |                                               |
| `trialPaymentMethodRequired`                         | `trial_payment_method_required`                                                   | same    |                                               |
| —                                                    | `checkout_settings` (`collect_*`, `proration_behavior`, `tax_collection_enabled`) | dropped | checkout phase; no display element reads them |

## `CompanyContextOutput` → `CompanyContext`

| Stub                 | RFC                   | Bucket                  | Why                                                                                                                                                                                                                                                                             |
| -------------------- | --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `name`         | same                  | same                    |                                                                                                                                                                                                                                                                                 |
| `plan`, `addOns`     | `plan`, `add_ons`     | same                    |                                                                                                                                                                                                                                                                                 |
| `subscription`       | `subscription`        | same shape, see below   |                                                                                                                                                                                                                                                                                 |
| `customBilling`      | `custom_billing`      | same                    |                                                                                                                                                                                                                                                                                 |
| `scheduledDowngrade` | `scheduled_downgrade` | same                    |                                                                                                                                                                                                                                                                                 |
| `creditAutoTopups[]` | —                     | **added** (PlanManager) | the v2 PlanManager shows auto top-up state per plan credit grant ("Adds 500 credits when 50 remaining", disabled, Edit). Not in RFC 0007 at all. Shape: `{ credit_id, availability, self_service, enabled, threshold_credits, amount }` with company overrides already applied. |

### `CompanyPlanOutput` → `CompanyPlan` — same (`catalog_id`, `is_add_on`, `is_custom`, `price`, `quantity`).

### `CompanyContextSubscriptionOutput` → `Subscription`

| Stub                                                    | RFC              | Bucket           | Why                                                                |
| ------------------------------------------------------- | ---------------- | ---------------- | ------------------------------------------------------------------ |
| `id`, `status`, `currency`, `interval`, `intervalCount` | same             | same             |                                                                    |
| `totalAmount`                                           | `total_price`    | renamed (amount) |                                                                    |
| `currentPeriodStart`, `currentPeriodEnd`                | same             | same             |                                                                    |
| `trialing`, `trialEnd`, `cancelAt`, `cancelAtPeriodEnd` | same             | same             |                                                                    |
| —                                                       | `payment_method` | dropped          | PaymentMethod element is out of scope; no display element reads it |

### `CompanyCustomBillingOutput` → `CustomBilling`

Same fields. **Semantics:** the stub's `dueAt` is derived as
`publishedAt + daysUntilDue` (the v2 rule); the RFC could ship `due_at`
directly and drop `days_until_due`, which no element reads otherwise.

### `CompanyScheduledDowngradeOutput` → `ScheduledDowngrade`

`price` → `amount` (renamed); otherwise same.

## `CompanyFeatureUsageOutput` → `FeatureUsageRow`

| Stub                                                           | RFC               | Bucket                       | Why                                                                                                              |
| -------------------------------------------------------------- | ----------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| entitlement block                                              | entitlement block | reshaped as above            |                                                                                                                  |
| `source`, `planEntitlementId`, `companyOverrideId`             | same              | same                         |                                                                                                                  |
| `access`, `usage`, `effectiveLimit`, `percentUsed`, `resetsAt` | same              | same                         |                                                                                                                  |
| `expiresAt`                                                    | —                 | **added** (IncludedFeatures) | hydrate rows carry `entitlement_expiration_date`; the v2 element renders "Expires {date}" for expiring overrides |
| `currentCost`, `currentCostCurrency`                           | same              | same                         |                                                                                                                  |

The list wrapper `{ rows }` is read as the array.

## `CompanyCreditBalancesOutput` → `CreditBalance[]`

| Stub                                      | RFC                                                                                                           | Bucket          | Why |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------- | --- |
| `credit: CreditRef & { description }`     | `credit_id`, `credit_name`, `credit_description`, `credit_singular_name`, `credit_plural_name`, `credit_icon` | reshaped        |     |
| `total`, `used`, `remaining`, `expiresAt` | same                                                                                                          | same            |     |
| `grants[]`                                | `grants[]`                                                                                                    | same, see below |     |

### `CompanyCreditGrantOutput` → `CreditGrantRow`

| Stub                                                   | RFC                        | Bucket   |
| ------------------------------------------------------ | -------------------------- | -------- |
| `id`, `reason`                                         | `id`, `grant_reason`       | renamed  |
| `plan: { id, name } \| null`                           | `plan_id`, `plan_name`     | reshaped |
| `bundle: { id, name } \| null`                         | `bundle_id`, `bundle_name` | reshaped |
| `quantity`, `quantityUsed`, `quantityRemaining`        | same                       | same     |
| `renewalPeriod`, `createdAt`, `validFrom`, `expiresAt` | same                       | same     |

## `CompanyInvoiceOutput` → `Invoice` — same.

## `CompanyUpcomingInvoiceOutput` → `UpcomingInvoice` — same.

`CompanyDiscountOutput` → `Discount` — same.

## Not needed by v3 (from hydrate, for the record)

`badge_visibility`, `stripe_embed`, `default_plan` / `post_trial_plan` on the
company (now `trial_expiry_plan` on the catalog), the four top-level
`show_*` flags and `display_settings` (consumer props), `checkout_settings`,
`custom_checkout_fields`, `add_on_compatibilities` (now per-plan),
`active_usage_based_entitlements`, per-user usage breakdowns, credit usage
aggregation, `is_initial`, `component`.

## Summary of requests to the API side

1. **Add** `current_price_id` to the company catalog plan decoration.
2. **Add** `expires_at` to `/company/usage` rows.
3. **Add** `compatible_plan_ids` to catalog credit bundles.
4. **Add** `credit_auto_topups[]` to `/company` (or confirm the display moves elsewhere).
5. **Consider** flat `prices[]` in place of period slots + `currency_prices` (+ drop `available_periods`, `overage_unit_price_decimal`).
6. **Consider** nesting the feature / credit identity blocks and `expiry`.
7. **Define** `/company/upcoming-invoice` without a subscription (`null`).
8. **Drop** from sub-admin tiers: `billing_strategy`, `pricing_model`, `bundle_type`, `license_id` on entitlements, `payment_method` on the subscription, `badge_visibility`, `checkout_settings` (until the checkout phase).
