/**
 * `GET` and `POST /checkout/tax-id`: the tax IDs on the company's billing
 * customer, and the write that sets one. The wire shapes are generated from
 * the API's spec by scripts/generate-billing-api.sh and re-exported here
 * under their domain names.
 */

import type { CompanyTaxIDView, TaxIDInput } from "../api/generated/models";

export { TaxIdType } from "../api/generated/models";
export type { CompanyTaxIDView, TaxIDInput };

/** One tax ID on file, as the provider verified it. */
export type TaxId = CompanyTaxIDView;

/** A tax ID to set: its provider type (`eu_vat`, `us_ein`, …) and value. */
export type TaxIdInput = TaxIDInput;
