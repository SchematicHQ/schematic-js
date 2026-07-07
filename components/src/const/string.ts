export const DEFAULT_CURRENCY = "USD";

export const MAXIMUM_SIGNIFICANT_DIGITS = 6;

/**
 * Credit consumption rates are stored with up to 10 decimal places of
 * precision, so rates and credit-derived quantities must be rendered with
 * enough fraction digits to represent very small values (e.g. `1e-10`)
 * instead of falling back to scientific notation or rounding down to `0`.
 */
export const MAXIMUM_FRACTION_DIGITS = 10;
