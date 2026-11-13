import { type CompanyPlanWithBillingSubView } from "../../../api/checkoutexternal";
import { FontStyle } from "../../../context";
import { useTranslation } from "../../../localization";
import {
  formatCurrency,
  shortenPeriod,
  type PriceInterval,
} from "../../../utils";
import { Flex, Text } from "../../ui";

interface AddOnProps {
  addOn: CompanyPlanWithBillingSubView;
  currency?: string;
  /** The subscription's interval, which a current add-on bills on. */
  priceInterval?: PriceInterval;
  layout: {
    addOns: {
      isVisible: boolean;
      fontStyle: FontStyle;
      showLabel: boolean;
    };
  };
}

export const AddOn = ({
  addOn,
  currency,
  priceInterval,
  layout,
}: AddOnProps) => {
  const { t, locale } = useTranslation();

  const resolvedInterval: PriceInterval | undefined =
    addOn.planPeriod === "one-time"
      ? { interval: addOn.planPeriod }
      : (priceInterval ??
        (addOn.planPeriod ? { interval: addOn.planPeriod } : undefined));

  return (
    <Flex
      $justifyContent="space-between"
      $alignItems="center"
      $flexWrap="wrap"
      $gap="1rem"
    >
      <Text display={layout.addOns.fontStyle}>{addOn.name}</Text>

      {typeof addOn.planPrice === "number" && resolvedInterval && (
        <Text>
          {formatCurrency(addOn.planPrice, { locale, currency })}
          <sub>
            {resolvedInterval.interval === "one-time"
              ? shortenPeriod(resolvedInterval.interval, t)
              : `/${shortenPeriod(
                  resolvedInterval.interval,
                  t,
                  resolvedInterval.intervalCount,
                )}`}
          </sub>
        </Text>
      )}
    </Flex>
  );
};
