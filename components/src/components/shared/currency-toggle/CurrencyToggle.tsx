import { useEmbed, useIsLightBackground } from "../../../hooks";
import { getCurrencySymbol } from "../../../utils";
import { Flex, Text } from "../../ui";

interface CurrencyToggleProps {
  currencies: string[];
  selectedCurrency: string;
  onSelect: (currency: string) => void;
}

export const CurrencyToggle = ({
  currencies,
  selectedCurrency,
  onSelect,
}: CurrencyToggleProps) => {
  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  return (
    <Flex
      data-testid="sch-currency-toggle"
      $alignSelf="center"
      $width="fit-content"
      $margin={0}
      $borderWidth="1px"
      $borderStyle="solid"
      $borderColor={
        isLightBackground
          ? "hsla(0, 0%, 0%, 0.125)"
          : "hsla(0, 0%, 100%, 0.125)"
      }
      $borderRadius="2.5rem"
      $cursor="pointer"
    >
      <Flex
        $alignItems="center"
        $padding="0.375rem 0.75rem"
        style={{ position: "relative" }}
      >
        <Text
          style={{
            color: settings.theme.typography.text.color,
          }}
          $size={15}
          $weight={600}
        >
          {getCurrencySymbol(selectedCurrency)} {selectedCurrency.toUpperCase()}
        </Text>

        <select
          data-testid="sch-currency-select"
          value={selectedCurrency}
          onChange={(e) => onSelect(e.target.value)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            fontSize: "inherit",
          }}
        >
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {getCurrencySymbol(currency)} {currency.toUpperCase()}
            </option>
          ))}
        </select>

        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ marginLeft: "0.25rem", flexShrink: 0 }}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke={settings.theme.typography.text.color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Flex>
    </Flex>
  );
};
