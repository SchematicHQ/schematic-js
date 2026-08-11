import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { styled } from "styled-components";

import { useIsLightBackground } from "../../../hooks";
import type { TaxIdValues } from "../../../utils";
import {
  isStripeTestTaxId,
  taxIdCountryOptions,
  taxIdJurisdictionsForCountry,
} from "../../../utils";
import { Box, Flex, Text } from "../../ui";
import { Input, Label } from "../payment-form/styles";

// The shared Input strips native appearance, which also removes the select
// indicator; restore a chevron so the pickers read as dropdowns.
const Select = styled(Input).attrs({ as: "select" })`
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='none' stroke='%23666' stroke-width='1.5' d='M1 1.5 6 6.5 11 1.5'/%3E%3C/svg%3E");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  padding-right: 2.25rem;
`;

interface TaxIdFieldProps {
  value: TaxIdValues;
  onChange: (value: TaxIdValues) => void;
  /** The parent saves the entered tax ID on this. */
  onValueBlur?: () => void;
}

/**
 * Tax ID inputs: a country select, a type select when the country has more
 * than one Stripe tax-ID scheme (e.g. Canada, Japan), and the value itself.
 * A controlled port of the admin app's TaxIdFields (schematic-api
 * app/src/components/forms/TaxIdFields).
 *
 * Format checking is advisory only: a value that does not match the
 * jurisdiction's pattern shows a "double-check" hint but never blocks
 * submission. Stripe accepts the value and — for EU/UK VAT and AU ABN only —
 * verifies it asynchronously.
 */
export const TaxIdField = ({
  value,
  onChange,
  onValueBlur,
}: TaxIdFieldProps) => {
  const { t, i18n } = useTranslation();

  const isLightBackground = useIsLightBackground();

  const countryOptions = useMemo(
    () => taxIdCountryOptions(i18n.language),
    [i18n.language],
  );

  const jurisdictions = taxIdJurisdictionsForCountry(value.country);

  const handleCountryChange = (country: string) => {
    // A single-scheme country selects its type implicitly; a multi-scheme
    // country clears the type so the select re-prompts.
    const next = taxIdJurisdictionsForCountry(country);
    onChange({
      ...value,
      country,
      type: next.length === 1 ? next[0].stripeType : "",
    });
  };

  const selected =
    jurisdictions.find((j) => j.stripeType === value.type) ??
    (jurisdictions.length === 1 ? jurisdictions[0] : undefined);

  const trimmed = value.value.trim();
  const showFormatHint =
    selected !== undefined &&
    trimmed !== "" &&
    !selected.pattern.test(trimmed) &&
    !isStripeTestTaxId(selected.stripeType, trimmed);

  return (
    <Flex $flexDirection="column" $gap="0.75rem">
      <Flex $gap="0.75rem">
        <Box $flexGrow={1} $flexBasis="50%">
          <Label htmlFor="tax-id-country">{t("Country")}</Label>
          <Select
            id="tax-id-country"
            value={value.country}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              handleCountryChange(event.target.value)
            }
          >
            <option value="">{t("Select country")}</option>
            {countryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Box>

        {jurisdictions.length > 1 && (
          <Box $flexGrow={1} $flexBasis="50%">
            <Label htmlFor="tax-id-type">{t("ID type")}</Label>
            <Select
              id="tax-id-type"
              value={value.type}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                onChange({ ...value, type: event.target.value })
              }
            >
              <option value="">{t("Select ID type")}</option>
              {jurisdictions.map((j) => (
                <option key={j.stripeType} value={j.stripeType}>
                  {j.label}
                </option>
              ))}
            </Select>
          </Box>
        )}
      </Flex>

      {selected && (
        <Box>
          <Label htmlFor="tax-id-value">{t("Tax ID")}</Label>
          <Input
            id="tax-id-value"
            type="text"
            placeholder={selected.example}
            value={value.value}
            onChange={(event) =>
              onChange({ ...value, value: event.target.value })
            }
            onBlur={onValueBlur}
          />
          {showFormatHint && (
            <Text
              $size={12}
              $color={isLightBackground ? "#B45309" : "#FBBF24"}
              style={{ display: "block", marginTop: "0.25rem" }}
            >
              {t("Tax ID format hint", {
                label: selected.label,
                example: selected.example,
              })}
            </Text>
          )}
        </Box>
      )}
    </Flex>
  );
};
