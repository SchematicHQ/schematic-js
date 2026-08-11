import type { TaxIDInput, TaxIdType } from "../api/checkoutexternal";

/**
 * One tax-ID jurisdiction the picker offers: a country plus the Stripe tax-ID
 * `type` it maps to, with an example value (used as the input placeholder) and
 * an advisory format pattern.
 *
 * The pattern is deliberately soft. Stripe does NOT validate tax IDs
 * synchronously — it stores the value and, for eu_vat / gb_vat / au_abn only,
 * verifies it asynchronously against the tax authority (VIES/HMRC/ABR). A
 * mismatch here renders a "double-check this" warning but never blocks
 * submission, so an unusual-but-real ID is never rejected by our own regex.
 *
 * This table intentionally mirrors the admin app's copy
 * (schematic-api app/src/models/taxIds.ts); keep the two in step.
 * `stripeType` must stay within the API's TaxIdType enum — the server rejects
 * types outside it.
 */
export type TaxIdJurisdiction = {
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
  /** Stripe tax-ID type submitted to the API. */
  stripeType: TaxIdType;
  /** Short name of the ID scheme, e.g. "VAT" or "GST/HST". */
  label: string;
  /** Example value from Stripe's tax-ID table; shown as the placeholder. */
  example: string;
  /** Advisory shape check; see note above. */
  pattern: RegExp;
};

/**
 * EU member states all submit type `eu_vat`, but each national VAT number has
 * its own prefix and shape, so each gets its own row (the row, not the Stripe
 * type, carries the example and pattern).
 */
const euVat = (
  country: string,
  example: string,
  pattern: RegExp,
): TaxIdJurisdiction => ({
  country,
  stripeType: "eu_vat",
  label: "VAT",
  example,
  pattern,
});

/**
 * Every jurisdiction the tax-ID picker offers, grouped by country. A country
 * with more than one entry (e.g. Canada, Japan) renders a type dropdown; a
 * country with one entry selects it implicitly.
 */
export const TaxIdJurisdictions: TaxIdJurisdiction[] = [
  // EU member states → eu_vat (verified asynchronously via VIES)
  euVat("AT", "ATU12345678", /^ATU\d{8}$/i),
  euVat("BE", "BE0123456789", /^BE[01]\d{9}$/i),
  euVat("BG", "BG0123456789", /^BG\d{9,10}$/i),
  euVat("HR", "HR12345678912", /^HR\d{11}$/i),
  euVat("CY", "CY12345678Z", /^CY\d{8}[A-Z]$/i),
  euVat("CZ", "CZ1234567890", /^CZ\d{8,10}$/i),
  euVat("DK", "DK12345678", /^DK\d{8}$/i),
  euVat("EE", "EE123456789", /^EE\d{9}$/i),
  euVat("FI", "FI12345678", /^FI\d{8}$/i),
  euVat("FR", "FRAB123456789", /^FR[A-Z0-9]{2}\d{9}$/i),
  euVat("DE", "DE123456789", /^DE\d{9}$/i),
  euVat("GR", "EL123456789", /^EL\d{9}$/i),
  euVat("HU", "HU12345678", /^HU\d{8}$/i),
  euVat("IE", "IE1234567AB", /^IE\d{7}[A-Z]{1,2}$/i),
  euVat("IT", "IT12345678912", /^IT\d{11}$/i),
  euVat("LV", "LV12345678912", /^LV\d{11}$/i),
  euVat("LT", "LT123456789123", /^LT(\d{9}|\d{12})$/i),
  euVat("LU", "LU12345678", /^LU\d{8}$/i),
  euVat("MT", "MT12345678", /^MT\d{8}$/i),
  euVat("NL", "NL123456789B12", /^NL\d{9}B\d{2}$/i),
  euVat("PL", "PL1234567890", /^PL\d{10}$/i),
  euVat("PT", "PT123456789", /^PT\d{9}$/i),
  euVat("RO", "RO1234567891", /^RO\d{2,10}$/i),
  euVat("SK", "SK1234567891", /^SK\d{10}$/i),
  euVat("SI", "SI12345678", /^SI\d{8}$/i),
  euVat("ES", "ESA1234567Z", /^ES[A-Z0-9]\d{7}[A-Z0-9]$/i),
  euVat("SE", "SE123456789123", /^SE\d{12}$/i),

  // Other jurisdictions
  {
    country: "AE",
    stripeType: "ae_trn",
    label: "TRN",
    example: "123456789012345",
    pattern: /^\d{15}$/,
  },
  {
    country: "AU",
    stripeType: "au_abn",
    label: "ABN",
    example: "12345678912",
    pattern: /^\d{11}$/,
  },
  {
    country: "AU",
    stripeType: "au_arn",
    label: "ARN",
    example: "123456789123",
    pattern: /^\d{12}$/,
  },
  {
    country: "BR",
    stripeType: "br_cnpj",
    label: "CNPJ",
    example: "01.234.456/5432-45",
    pattern: /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
  },
  {
    country: "BR",
    stripeType: "br_cpf",
    label: "CPF",
    example: "123.456.789-87",
    pattern: /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/,
  },
  {
    country: "CA",
    stripeType: "ca_bn",
    label: "BN",
    example: "123456789",
    pattern: /^\d{9}$/,
  },
  {
    country: "CA",
    stripeType: "ca_gst_hst",
    label: "GST/HST",
    example: "123456789RT0002",
    pattern: /^\d{9}RT\d{4}$/i,
  },
  {
    country: "CA",
    stripeType: "ca_pst_bc",
    label: "PST (British Columbia)",
    example: "PST-1234-5678",
    pattern: /^PST-?\d{4}-?\d{4}$/i,
  },
  {
    country: "CA",
    stripeType: "ca_pst_mb",
    label: "RST (Manitoba)",
    example: "123456-7",
    pattern: /^\d{6}-?\d$/,
  },
  {
    country: "CA",
    stripeType: "ca_pst_sk",
    label: "PST (Saskatchewan)",
    example: "1234567",
    pattern: /^\d{7}$/,
  },
  {
    country: "CA",
    stripeType: "ca_qst",
    label: "QST (Québec)",
    example: "1234567890TQ1234",
    pattern: /^\d{10}TQ\d{4}$/i,
  },
  {
    country: "CH",
    stripeType: "ch_vat",
    label: "VAT",
    example: "CHE-123.456.789 MWST",
    pattern: /^CHE[- ]?\d{3}\.?\d{3}\.?\d{3}( ?(MWST|TVA|IVA))?$/i,
  },
  {
    country: "CH",
    stripeType: "ch_uid",
    label: "UID",
    example: "CHE-123.456.789 HR",
    pattern: /^CHE[- ]?\d{3}\.?\d{3}\.?\d{3}( ?HR)?$/i,
  },
  {
    country: "GB",
    stripeType: "gb_vat",
    label: "VAT",
    example: "GB123456789",
    pattern: /^GB(\d{9}|\d{12})$/i,
  },
  {
    country: "HK",
    stripeType: "hk_br",
    label: "BR number",
    example: "12345678",
    pattern: /^\d{8}$/,
  },
  {
    country: "ID",
    stripeType: "id_npwp",
    label: "NPWP",
    example: "012.345.678.9-012.345",
    pattern: /^\d{2}\.?\d{3}\.?\d{3}\.?\d-?\d{3}\.?\d{3}$/,
  },
  {
    country: "IL",
    stripeType: "il_vat",
    label: "VAT",
    example: "000012345",
    pattern: /^\d{9}$/,
  },
  {
    country: "IN",
    stripeType: "in_gst",
    label: "GST",
    example: "12ABCDE3456FGZH",
    pattern: /^\d{2}[A-Z0-9]{13}$/i,
  },
  {
    country: "JP",
    stripeType: "jp_cn",
    label: "Corporate number",
    example: "1234567891234",
    pattern: /^\d{13}$/,
  },
  {
    country: "JP",
    stripeType: "jp_rn",
    label: "Registered foreign business number",
    example: "12345",
    pattern: /^\d{5}$/,
  },
  {
    country: "JP",
    stripeType: "jp_trn",
    label: "Tax registration number",
    example: "T1234567891234",
    pattern: /^T\d{13}$/i,
  },
  {
    country: "KR",
    stripeType: "kr_brn",
    label: "BRN",
    example: "123-45-67890",
    pattern: /^\d{3}-?\d{2}-?\d{5}$/,
  },
  {
    country: "MX",
    stripeType: "mx_rfc",
    label: "RFC",
    example: "ABC010203AB9",
    pattern: /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i,
  },
  {
    country: "MY",
    stripeType: "my_frp",
    label: "FRP",
    example: "12345678",
    pattern: /^\d{8}$/,
  },
  {
    country: "MY",
    stripeType: "my_itn",
    label: "ITN",
    example: "C 1234567890",
    pattern: /^[A-Z]{1,2} ?\d{10,11}$/i,
  },
  {
    country: "MY",
    stripeType: "my_sst",
    label: "SST",
    example: "A12-3456-78912345",
    pattern: /^[A-Z]\d{2}-?\d{4}-?\d{8}$/i,
  },
  {
    country: "NO",
    stripeType: "no_vat",
    label: "VAT",
    example: "123456789MVA",
    pattern: /^\d{9}MVA$/i,
  },
  {
    country: "NZ",
    stripeType: "nz_gst",
    label: "GST",
    example: "123456789",
    pattern: /^\d{8,9}$/,
  },
  {
    country: "PH",
    stripeType: "ph_tin",
    label: "TIN",
    example: "123456789012",
    pattern: /^\d{12}$/,
  },
  {
    country: "SA",
    stripeType: "sa_vat",
    label: "VAT",
    example: "123456789012345",
    pattern: /^\d{15}$/,
  },
  {
    country: "SG",
    stripeType: "sg_gst",
    label: "GST",
    example: "M12345678X",
    pattern: /^[A-Z]\d{8}[A-Z]$/i,
  },
  {
    country: "SG",
    stripeType: "sg_uen",
    label: "UEN",
    example: "123456789F",
    pattern: /^\d{8,9}[A-Z]$/i,
  },
  {
    country: "TH",
    stripeType: "th_vat",
    label: "VAT",
    example: "1234567891234",
    pattern: /^\d{13}$/,
  },
  {
    country: "TR",
    stripeType: "tr_tin",
    label: "TIN",
    example: "0123456789",
    pattern: /^\d{10}$/,
  },
  {
    country: "TW",
    stripeType: "tw_vat",
    label: "VAT",
    example: "12345678",
    pattern: /^\d{8}$/,
  },
  {
    country: "US",
    stripeType: "us_ein",
    label: "EIN",
    example: "12-3456789",
    pattern: /^\d{2}-?\d{7}$/,
  },
  {
    country: "ZA",
    stripeType: "za_vat",
    label: "VAT",
    example: "4123456789",
    pattern: /^4\d{9}$/,
  },
];

/** Jurisdictions available for a country ("" or unknown → none). */
export const taxIdJurisdictionsForCountry = (
  country: string,
): TaxIdJurisdiction[] =>
  TaxIdJurisdictions.filter((j) => j.country === country.toUpperCase());

/** Countries with at least one tax-ID jurisdiction, as alpha-2 codes. */
export const taxIdCountries: string[] = [
  ...new Set(TaxIdJurisdictions.map(({ country }) => country)),
];

/**
 * Country options for the picker, labeled in the given locale via
 * Intl.DisplayNames and sorted by that label. Falls back to the bare code
 * when the runtime cannot name a region.
 */
export const taxIdCountryOptions = (
  locale: string,
): { value: string; label: string }[] => {
  let displayNames: Intl.DisplayNames | undefined;
  try {
    displayNames = new Intl.DisplayNames([locale, "en"], { type: "region" });
  } catch {
    // An unsupported locale tag falls back to the bare country codes.
  }

  return taxIdCountries
    .map((code) => ({ value: code, label: displayNames?.of(code) ?? code }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
};

/**
 * TaxIdValues is the form-state shape the tax-ID field group reads and writes.
 * `country` narrows the picker; `type` is the Stripe tax-ID type actually
 * submitted; `value` is the ID itself.
 */
export type TaxIdValues = {
  country: string;
  type: string;
  value: string;
};

export const emptyTaxIdValues: TaxIdValues = {
  country: "",
  type: "",
  value: "",
};

/** True when the group holds a submittable {type, value} pair. */
export const hasTaxIdValue = (taxId?: Partial<TaxIdValues> | null): boolean =>
  Boolean(taxId?.type && taxId?.value?.trim());

/**
 * Builds the API payload from the form values, or undefined when no complete
 * {type, value} pair was entered — an incomplete group means "nothing to
 * submit", never a deletion.
 */
export const toTaxIdInput = (taxId: TaxIdValues): TaxIDInput | undefined =>
  hasTaxIdValue(taxId)
    ? {
        type: taxId.type as TaxIdType,
        value: taxId.value.trim(),
      }
    : undefined;

/**
 * Stripe's test-mode magic tax IDs for the verified types (verify / fail /
 * stay pending). They don't match any real format, so the form skips the
 * format hint for them; a country prefix (e.g. GB000000000) is tolerated.
 */
const stripeTestTaxIdValues = new Set(["000000000", "111111111", "222222222"]);

const verifiedTaxIdTypes = new Set(["au_abn", "eu_vat", "gb_vat"]);

export const isStripeTestTaxId = (stripeType: string, value: string): boolean =>
  verifiedTaxIdTypes.has(stripeType) &&
  stripeTestTaxIdValues.has(value.replace(/^[A-Za-z]+/, ""));
